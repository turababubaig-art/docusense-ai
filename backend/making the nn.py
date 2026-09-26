import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-x))


x = 1
y = 1

w = 0.5
b = 0

learning_rate = 0.1

for epoch in range(10):

    # Forward
    z = x * w + b
    a = sigmoid(z)

    # Loss
    loss = (y - a) ** 2

    # Backpropagation
    dL_da = 2 * (a - y)
    da_dz = a * (1 - a)
    dz_dw = x

    dL_dw = dL_da * da_dz * dz_dw

    # Update
    w = w - learning_rate * dL_dw

    print("Epoch:", epoch,
          "Prediction:", a,
          "Loss:", loss,
          "Weight:", w)