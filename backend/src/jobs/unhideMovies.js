import { Movie } from "../models/Movie.js";

/**
 * Scheduled job to automatically unhide movies that have reached their unhideDate
 */
export async function checkAndUnhideMovies() {
  try {
    const now = new Date();
    const result = await Movie.updateMany(
      {
        isHidden: true,
        unhideDate: { $ne: null, $lte: now },
      },
      {
        $set: { isHidden: false },
        $unset: { unhideDate: "" },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[UnhideJob] Automatically unhid ${
          result.modifiedCount
        } movie(s) at ${now.toISOString()}`
      );
    }
  } catch (error) {
    console.error("[UnhideJob] Error checking and unhiding movies:", error);
  }
}

/**
 * Start the scheduled job (runs every hour)
 */
export function startUnhideMoviesJob() {
  console.log("[UnhideJob] Starting scheduled job (runs every hour)");

  // Run immediately on startup
  checkAndUnhideMovies();

  // Then run every hour
  setInterval(checkAndUnhideMovies, 60 * 60 * 1000);
}
