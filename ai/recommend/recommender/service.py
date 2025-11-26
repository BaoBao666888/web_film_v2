from typing import List, Dict, Any, Optional
import os
import math
import joblib
import numpy as np


class RecommendationService:
    """
    Service gom toàn bộ logic gợi ý phim cho user.

    Hai cách khởi tạo:

    1) Cách hiện tại trong api_main:
        service = RecommendationService("path/to/recommender.joblib")

       -> __init__ sẽ tự joblib.load(...) và set:
          - self.movies_meta
          - self.movie2idx
          - self.idx2movie
          - self.similarity (numpy array hoặc None)
          - self.user_items
          - self.user_favorites

       (giả định train_recommender đã lưu các key đó trong file joblib)

    2) Nếu sau này muốn inject cứng:
        RecommendationService(
            movies_meta=...,
            movie2idx=...,
            idx2movie=...,
            similarity=...,
            user_items=...,
            user_favorites=...,
        )
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        movies_meta: Optional[Dict[str, Dict[str, Any]]] = None,
        movie2idx: Optional[Dict[str, int]] = None,
        idx2movie: Optional[Dict[int, str]] = None,
        similarity: Optional[np.ndarray] = None,
        user_items: Optional[Dict[str, List[int]]] = None,
        user_favorites: Optional[Dict[str, List[str]]] = None,
    ) -> None:

        # Trường hợp đang dùng trong api_main: truyền mỗi model_path
        if model_path is not None and movies_meta is None and movie2idx is None and idx2movie is None:
            if not os.path.isfile(model_path):
                raise FileNotFoundError(f"❌ Không tìm thấy model: {model_path}")

            print(f"🔹 Load recommender model từ: {model_path}")
            data = joblib.load(model_path)

            # ⚠️ Nếu train_recommender lưu key khác thì sửa tên key ở đây
            self.movies_meta: Dict[str, Dict[str, Any]] = data.get("movies_meta", {})
            self.movie2idx: Dict[str, int] = data.get("movie2idx", {})
            self.idx2movie: Dict[int, str] = data.get("idx2movie", {})
            self.similarity: Optional[np.ndarray] = data.get("similarity", None)
            self.user_items: Dict[str, List[int]] = data.get("user_items", {})
            self.user_favorites: Dict[str, List[str]] = data.get("user_favorites", {})

            print(
                f"   ✅ movies_meta: {len(self.movies_meta)} phim, "
                f"len(movie2idx)={len(self.movie2idx)}, "
                f"len(user_items)={len(self.user_items)}, "
                f"len(user_favorites)={len(self.user_favorites)}"
            )

        else:
            # Trường hợp inject thủ công
            self.movies_meta = movies_meta or {}
            self.movie2idx = movie2idx or {}
            self.idx2movie = idx2movie or {}
            self.similarity = similarity
            self.user_items = user_items or {}
            self.user_favorites = user_favorites or {}

    # -------------------- HÀM TÍNH ĐIỂM POPULARITY --------------------
    def _score_by_rating_and_views(self, mid: str) -> float:
        """
        Tính điểm kết hợp RATING + VIEW_COUNT cho 1 movie_id.
        - rating: [0,5] (ưu tiên chính)
        - views: scale log để tránh phim quá lớn đè hết.
        """
        meta = self.movies_meta.get(mid, {})

        # rating
        r = meta.get("rating")
        try:
            rating = float(r) if r is not None else 0.0
        except (TypeError, ValueError):
            rating = 0.0

        # views: thử nhiều field khác nhau
        view_raw = (
            meta.get("view_count")
            or meta.get("views")
            or meta.get("totalViews")
            or meta.get("watch_count")
            or 0
        )
        try:
            views = float(view_raw) if view_raw is not None else 0.0
        except (TypeError, ValueError):
            views = 0.0

        # scale views: dùng log1p để bớt chênh lệch
        views_score = math.log1p(max(views, 0.0))

        # trọng số: rating vẫn là chính
        score = rating * 3.0 + views_score
        return score

    # -------------------- HÀM BUILD MỘT PHẦN TỬ KẾT QUẢ --------------------
    def _build_result_item(self, movie_id: str) -> Dict[str, Any]:
        meta = self.movies_meta.get(movie_id, {})

        poster = (
            meta.get("poster")
            or meta.get("thumbnail")
            or ""
        )

        # moods[0..] -> list moods
        moods: List[str] = []
        for key, value in meta.items():
            if key.startswith("moods[") and isinstance(value, str) and value:
                moods.append(value)

        # tags[0..] -> genres string
        tags = [
            value
            for key, value in meta.items()
            if key.startswith("tags[") and isinstance(value, str) and value
        ]
        genres = ", ".join(tags)

        return {
            "id": movie_id,
            "title": meta.get("title", str(movie_id)),
            "poster": poster,
            "moods": moods,
            "genres": genres,
            "rating": meta.get("rating", None),
        }

    # -------------------- HÀM CHÍNH: GỢI Ý CHO USER --------------------
    def recommend_for_user(self, user_id: Optional[str], top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Logic đầy đủ:

        1) Nếu user_id None / rỗng -> coi như guest mới
            -> gợi ý phim hot theo RATING + VIEW_COUNT

        2) Lấy lịch sử xem (self.user_items[user_id]) -> list index
        3) Lấy danh sách phim yêu thích (self.user_favorites[user_id]) -> list movie_id
           -> convert sang index (nếu có trong movie2idx)

        4) seed_indices = union(lịch sử xem, favorites_idx)
           - Nếu seed trống:
                -> CASE: user mới, không history, không favorites
                -> gợi ý theo độ hot (rating + views)
           - Nếu seed có:
                -> CASE: có lịch sử xem và/hoặc favorites
                -> Nếu self.similarity tồn tại:
                        dùng CF item-item từ seed_indices
                   Ngược lại:
                        bỏ qua CF, dùng fallback popularity
                -> Luôn loại bỏ phim đã xem / đã yêu thích khỏi gợi ý.
        """

        if not user_id:
            user_id = "__guest__"

        # 1. Lấy history & favorites
        history_indices = list(set(self.user_items.get(user_id, [])))  # unique index
        fav_movie_ids = self.user_favorites.get(user_id, [])          # list movie_id

        # đổi favorites -> index (nếu có trong movie2idx)
        fav_indices: List[int] = []
        for mid in fav_movie_ids:
            idx = self.movie2idx.get(mid)
            if idx is not None:
                fav_indices.append(idx)

        fav_indices = list(set(fav_indices))

        # seed = union(history, favorites)
        seed_indices: List[int] = sorted(set(history_indices + fav_indices))

        # -------------------- BUILD BLOCKLIST (KHÔNG GỢI Ý LẠI) --------------------
        seed_movie_ids = {
            self.idx2movie[idx]
            for idx in seed_indices
            if idx in self.idx2movie
        }

        # -------------------- CASE: KHÔNG CÓ BẤT KỲ HẠT GIỐNG NÀO --------------------
        if not seed_indices:
            print(f"👀 User {user_id} là user mới (không history, không favorites) → gợi ý theo rating + lượt xem")

            all_movie_ids = list(self.movies_meta.keys())
            # sort toàn bộ theo độ hot
            all_movie_ids.sort(key=self._score_by_rating_and_views, reverse=True)
            final_movie_ids = all_movie_ids[:top_k]

            results = [self._build_result_item(mid) for mid in final_movie_ids]
            print(f"✨ Gợi ý cho {user_id}: {final_movie_ids}")
            return results

        # -------------------- CASE: CÓ ÍT NHẤT 1 HẠT GIỐNG (XEM HOẶC YÊU THÍCH) --------------------
        print(
            f"👀 User {user_id} có {len(history_indices)} phim trong history "
            f"và {len(fav_movie_ids)} phim yêu thích → tổng seed: {len(seed_indices)}"
        )

        use_cf = self.similarity is not None and isinstance(self.similarity, np.ndarray)

        cf_candidate_movie_ids: List[str] = []

        if use_cf:
            sim = self.similarity
            num_items = sim.shape[0]
            scores = np.zeros(num_items, dtype=float)

            # Cộng dồn similarity từ tất cả hạt giống
            for idx in seed_indices:
                if 0 <= idx < num_items:
                    scores += sim[idx]

            # Sắp xếp theo điểm similarity giảm dần
            candidate_indices = list(np.argsort(scores)[::-1])

            seen_seed_set = set(seed_indices)
            used_movie_ids: set[str] = set()

            for idx in candidate_indices:
                # bỏ qua index không hợp lệ
                if idx < 0 or idx >= num_items:
                    continue

                # bỏ những phim dùng làm seed (đã xem / đã yêu thích)
                if idx in seen_seed_set:
                    continue

                mid = self.idx2movie.get(idx)
                if not mid:
                    continue

                if mid in seed_movie_ids:
                    # đã nằm trong history hoặc favorites
                    continue

                if mid in used_movie_ids:
                    continue

                cf_candidate_movie_ids.append(mid)
                used_movie_ids.add(mid)

                if len(cf_candidate_movie_ids) >= top_k:
                    break

        # -------------------- Fallback: nếu CF không đủ hoặc không có similarity --------------------
        final_movie_ids: List[str] = []

        # Ưu tiên CF trước nếu có
        if cf_candidate_movie_ids:
            final_movie_ids.extend(cf_candidate_movie_ids)

        if len(final_movie_ids) < top_k:
            if not use_cf:
                print(
                    f"⚠ Không có similarity matrix → bỏ qua CF, dùng popularity + loại phim đã xem / yêu thích."
                )
            else:
                print(
                    f"⚠ CF không đủ phim mới (chỉ có {len(final_movie_ids)}), "
                    "bổ sung bằng phim chưa xem/yêu thích theo rating + lượt xem"
                )

            # set để tránh trùng lặp
            block_set = set(final_movie_ids) | set(seed_movie_ids)

            all_movie_ids = list(self.movies_meta.keys())
            cold_candidates = [mid for mid in all_movie_ids if mid not in block_set]

            # sort theo độ hot
            cold_candidates.sort(key=self._score_by_rating_and_views, reverse=True)

            for mid in cold_candidates:
                final_movie_ids.append(mid)
                if len(final_movie_ids) >= top_k:
                    break

        # -------------------- XÂY KẾT QUẢ --------------------
        results: List[Dict[str, Any]] = [self._build_result_item(mid) for mid in final_movie_ids]

        print(f"✨ Gợi ý cho {user_id}: {final_movie_ids}")
        return results
