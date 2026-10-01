import secrets
A = "23456789abcdefghjkmnpqrstuvwxyz"
print("".join(secrets.choice(A) for _ in range(6)))
