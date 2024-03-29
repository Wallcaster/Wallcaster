import pickle
from pathlib import Path

# charger le classificateur
with open("/data/trained_data.pickle","rb") as file:
    classifier = pickle.load(file)

def is_positive(txt: str) -> bool:
    res = classifier(txt)
    if res[0]['label'] == "positive":
        return True
    else:
        return False
    
if __name__ == "__main__":
    print("Ready to process sentences. (Ctrl+C to exit)\n")

    while True:
        txt = input("Enter a sentence: ")
        print("The result is: ", is_positive(txt), end="\n\n")


