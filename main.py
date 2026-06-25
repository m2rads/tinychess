import os
import chess
import math
import torch
import torch.nn.functional as F
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

class Linear:
    def __init__(self, fan_in, fan_out, bias=True):
        self.weight = torch.randn((fan_in, fan_out)) / fan_in**0.5
        self.bias = torch.zeros(fan_out) if bias else None
    def __call__(self, x):
        self.out = x @ self.weight
        if self.bias is not None:
            self.out += self.bias
        return self.out

class Conv2d:
    def __init__(self, out_channels, in_channels, k, stride, padding, bias=False):
        fan_in = in_channels * k * k
        self.weight = torch.randn((out_channels, in_channels, k, k)) * math.sqrt(2/fan_in)
        self.bias = torch.zeros(out_channels) if bias else None
        self.s = stride
        self.p = padding
    def __call__(self, x):
        self.out = F.conv2d(x, self.weight, self.bias, stride=self.s, padding=self.p)
        return self.out

class BatchNorm2d:
    def __init__(self, dim, eps=1e-5, momentum=0.1):
        self.eps = eps
        self.training = True
        self.gamma = torch.ones((1, dim, 1, 1))
        self.beta = torch.zeros((1, dim, 1, 1))
        self.running_mean = torch.zeros((1, dim, 1, 1))
        self.running_var = torch.ones((1, dim, 1, 1))
    def __call__(self, x):
        if self.training:
            xmean = x.mean((0, 2, 3), keepdim=True)
            xvar = x.var((0, 2, 3), keepdim=True)
        else:
            xmean = self.running_mean
            xvar = self.running_var
        xhat = (x - xmean) / torch.sqrt(xvar + self.eps)
        self.out = self.gamma * xhat + self.beta
        return self.out

class Relu:
    def __call__(self, x):
        self.out = torch.relu(x)
        return self.out

class Flatten:
    def __call__(self, x):
        self.out = x.flatten(start_dim=1)
        return self.out

def load_model(layers, device="cpu", training=False):
    local_path = os.environ.get("MODEL_PATH")
    if local_path:
        checkpoint = torch.load(local_path, map_location=device)
    else:
        from huggingface_hub import hf_hub_download
        path = hf_hub_download(repo_id="m2rads/tinychess", filename="model_params.pt", revision="v0.0.9")
        checkpoint = torch.load(path, map_location=device)
    for layer, ls in zip(layers, checkpoint["layers"]):
        if "weight" in ls: layer.weight = ls["weight"].to(device)
        if "bias" in ls: layer.bias = ls["bias"].to(device)
        if "gamma" in ls:
            layer.gamma = ls["gamma"].to(device)
            layer.beta = ls["beta"].to(device)
            layer.running_mean = ls["running_mean"].to(device)
            layer.running_var = ls["running_var"].to(device)
        if hasattr(layer, "training"):
            layer.training = training
    return checkpoint.get("lossi", [])

all_moves = []
for from_sqr in chess.SQUARES:
    for to_sqr in chess.SQUARES:
        if from_sqr != to_sqr:
            all_moves.append(chess.Move(from_sqr, to_sqr))
            for promo in [chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT]:
                all_moves.append(chess.Move(from_sqr, to_sqr, promotion=promo))
all_moves = sorted(set(str(m) for m in all_moves))
mtoi = {m: i for i, m in enumerate(all_moves)}
itom = {i: m for i, m in enumerate(all_moves)}
all_moves_size = len(all_moves)

layers = [
    Conv2d(32, 13, 3, 1, 1, bias=False), BatchNorm2d(32), Relu(),
    Conv2d(32, 32, 3, 1, 1, bias=False), BatchNorm2d(32), Relu(),
    Conv2d(32, 32, 3, 1, 1, bias=False), BatchNorm2d(32), Relu(),
    Conv2d(32, 32, 3, 1, 1, bias=False), BatchNorm2d(32), Relu(),
    Conv2d(32, 32, 3, 1, 1, bias=False), BatchNorm2d(32), Relu(),
    Flatten(),
    Linear(2048, all_moves_size, bias=True),
]

lossi = load_model(layers, device="cpu", training=False)
print(lossi[-1])

def encode_board(board):
    planes = torch.zeros(13, 8, 8)
    piece_map = {
        (chess.PAWN, chess.WHITE): 0, (chess.KNIGHT, chess.WHITE): 1,
        (chess.BISHOP, chess.WHITE): 2, (chess.ROOK, chess.WHITE): 3,
        (chess.QUEEN, chess.WHITE): 4, (chess.KING, chess.WHITE): 5,
        (chess.PAWN, chess.BLACK): 6, (chess.KNIGHT, chess.BLACK): 7,
        (chess.BISHOP, chess.BLACK): 8, (chess.ROOK, chess.BLACK): 9,
        (chess.QUEEN, chess.BLACK): 10, (chess.KING, chess.BLACK): 11,
    }
    for square, piece in board.piece_map().items():
        rank, file = square // 8, square % 8
        planes[piece_map[(piece.piece_type, piece.color)], rank, file] = 1.0
    planes[12] = float(board.turn)
    return planes

app = FastAPI()

class MoveRequest(BaseModel):
    fen: str

@app.post("/move")
def predict_next_move(request: MoveRequest):
    board = chess.Board(request.fen)
    x = encode_board(board).unsqueeze(0)
    with torch.no_grad():
        for layer in layers:
            x = layer(x)
        logits = x
        mask = torch.full((all_moves_size,), float("-inf"))
        for move in board.legal_moves:
            if str(move) in mtoi:
                mask[mtoi[str(move)]] = 0.0
        logits = logits + mask
        pred = logits.argmax(dim=1)
    return {"move": f"{itom[int(pred.item())]}"}

app.mount("/node_modules", StaticFiles(directory="frontend/node_modules"), name="node_modules")
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
