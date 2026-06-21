import chess
import torch
import torch.nn.functional as F
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# load the model
from huggingface_hub import hf_hub_download
path = hf_hub_download(repo_id="m2rads/tinychess", filename="model_params.pt", revision="v0.0.5")
checkpoint = torch.load(path, map_location="cpu")
W1 = checkpoint["W1"]
# b1 = checkpoint["b1"]
W2 = checkpoint["W2"]
b2 = checkpoint["b2"]
bngain = checkpoint["bngain"]
bnbias = checkpoint["bnbias"]
bnmean_running = checkpoint["bnmean_running"]
bnstd_running = checkpoint["bnstd_running"]

# create a map of all possible moves on the board
all_moves = []
for from_sqr in chess.SQUARES:
    for to_sqr in chess.SQUARES:
        if from_sqr != to_sqr:
            all_moves.append(chess.Move(from_sqr, to_sqr))
            # also append promotions
            for promo in [chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT]:
                promo_move = chess.Move(from_sqr, to_sqr, promotion=promo)
                all_moves.append(promo_move)

all_moves = sorted(set(str(m) for m in all_moves))
mtoi = {m: i for i, m in enumerate(all_moves)}  # move to index
itom = {i: m for i, m in enumerate(all_moves)}  # index to move
all_moves_size = len(all_moves)

app = FastAPI()


class MoveRequest(BaseModel):
    fen: str


@app.post("/move")
def predict_next_move(request: MoveRequest):
    board = chess.Board(request.fen)
    x = encode_board(board).unsqueeze(0)
    with torch.no_grad():
        preact = F.conv2d(x, W1, bias=None, stride=1, padding=1)
        preact = bngain * (preact - bnmean_running) / bnstd_running + bnbias
        r = torch.relu(preact)
        r = r.flatten(start_dim=1)
        logits = r @ W2 + b2
        mask = torch.full((all_moves_size,), float("-inf"))
        for move in board.legal_moves:
            if str(move) in mtoi:
                mask[mtoi[str(move)]] = 0.0
        logits = logits + mask
        pred = logits.argmax(dim=1)
    return {"move": f"{itom[pred.item()]}"}


app.mount(
    "/node_modules", StaticFiles(directory="frontend/node_modules"), name="node_modules"
)
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")


def encode_board(board):
    planes = torch.zeros(13, 8, 8)
    piece_map = {
        (chess.PAWN, chess.WHITE): 0,
        (chess.KNIGHT, chess.WHITE): 1,
        (chess.BISHOP, chess.WHITE): 2,
        (chess.ROOK, chess.WHITE): 3,
        (chess.QUEEN, chess.WHITE): 4,
        (chess.KING, chess.WHITE): 5,
        (chess.PAWN, chess.BLACK): 6,
        (chess.KNIGHT, chess.BLACK): 7,
        (chess.BISHOP, chess.BLACK): 8,
        (chess.ROOK, chess.BLACK): 9,
        (chess.QUEEN, chess.BLACK): 10,
        (chess.KING, chess.BLACK): 11,
    }

    for square, piece in board.piece_map().items():
        rank = square // 8
        file = square % 8
        plane = piece_map[(piece.piece_type, piece.color)]
        planes[plane, rank, file] = 1.0

    planes[12] = board.turn  # add the turn
    return planes
