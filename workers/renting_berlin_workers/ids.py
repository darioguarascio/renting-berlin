from nanoid import generate


def new_id(size: int = 21) -> str:
    return generate(size=size)
