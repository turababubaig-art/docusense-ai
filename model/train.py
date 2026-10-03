import pandas as pd
import torch
import torch.nn as nn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


# Load dataset
data = pd.read_csv("dataset/documents.csv")

texts = data["text"]
labels = data["label"]


# Convert labels into numbers
encoder = LabelEncoder()
y = encoder.fit_transform(labels)


# Convert text into numbers
vectorizer = TfidfVectorizer()

X = vectorizer.fit_transform(texts).toarray()


# Convert to PyTorch tensors
X = torch.tensor(X, dtype=torch.float32)
y = torch.tensor(y, dtype=torch.long)


print("Input shape:", X.shape)
print("Classes:", encoder.classes_)

class DocumentClassifier(nn.Module):

    def __init__(self, input_size, hidden_size, num_classes):
        super().__init__()

        self.network = nn.Sequential(

            nn.Linear(input_size, hidden_size),

            nn.ReLU(),

            nn.Linear(hidden_size, 32),

            nn.ReLU(),

            nn.Linear(32, num_classes)
        )

    def forward(self, x):
        return self.network(x)

input_size = X.shape[1]
hidden_size = 64
num_classes = len(encoder.classes_)

model = DocumentClassifier(
    input_size,
    hidden_size,
    num_classes
)

loss_function = nn.CrossEntropyLoss()

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=0.001
)


for epoch in range(100):

    predictions = model(X)

    loss = loss_function(predictions, y)

    optimizer.zero_grad()

    loss.backward()

    optimizer.step()

    if (epoch + 1) % 10 == 0:
        print(
            f"Epoch {epoch + 1}/100 "
            f"Loss: {loss.item():.4f}"
        )