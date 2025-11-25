import json
import pandas as pd

with open('D:/download/lumi_ai.movies.json','r',encoding='utf-8') as f:
    data=json.load(f)

rows=[]
for m in data:
    rows.append({
        "id": m["id"],
        "title": m["title"].strip(),
        "genres": ";".join(m.get("tags", [])),
        "description": m.get("synopsis", "").replace("\n"," ").strip(),
        "thumbnail": m.get("thumbnail",""),
        "poster": m.get("poster",""),
    })

df=pd.DataFrame(rows)
df.to_csv('D:/web_film_v2-main/ai/search/data/movies_from_json.csv', index=False, encoding="utf-8")
df.head()
