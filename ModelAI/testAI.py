from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv() 
api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(
  api_key=api_key,
)

completion = client.chat.completions.create(
  model="gpt-4o-mini",
  store=True,
  messages=[
    {"role": "user", "content": "write a haiku about ai"}
  ]
)

print(completion.choices[0].message)
