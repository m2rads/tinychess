from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()


@app.post("/move")
def predict_next_move():
    return {"move": "e7e5"}


app.mount("/node_modules", StaticFiles(directory="frontend/node_modules"), name="node_modules")
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
