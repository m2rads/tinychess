# %%
import requests
import chess.pgn
import zstandard as zstd
import io

# %%
def stream_lichess_games(url, max_games=1000, min_rating=1500):
    games = []

    with requests.get(url, stream=True) as r:
        dctx = zstd.ZstdDecompressor()
        with dctx.stream_reader(r.raw) as reader:
            text_stream = io.TextIOWrapper(reader, encoding='utf-8', errors='ignore')

            while len(games) < max_games:
                game = chess.pgn.read_game(text_stream)
                if game is None:
                    break

                # filter by rating
                white_elo = int(game.headers.get('WhiteElo', 0))
                black_elo = int(game.headers.get('BlackElo', 0))

                if white_elo >= min_rating and black_elo >= min_rating:
                    games.append(game)
                    if len(games) % 100 == 0:
                        print(f"loaded {len(games)} games...")

    return games

games = stream_lichess_games("https://database.lichess.org/standard/lichess_db_standard_rated_2023-09.pgn.zst")
