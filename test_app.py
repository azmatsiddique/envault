import os
from dotenv import load_dotenv

# Path to the sample env file we're using with EnvVault
env_path = os.path.join(os.path.dirname(__file__), 'sample.env')

def test_env_injection():
    print(f"--- Testing EnvVault with Python ---")
    print(f"Reading from: {env_path}\n")
    
    # Load the environment variables from the file
    load_dotenv(env_path)
    
    # Retrieve keys defined in our EnvVault setup
    api_key = os.getenv("API_KEY")
    db_url = os.getenv("DB_URL")
    debug_mode = os.getenv("DEBUG")
    
    print(f"Current Environment Values:")
    print(f"  API_KEY: {api_key}")
    print(f"  DB_URL:  {db_url}")
    print(f"  DEBUG:   {debug_mode}")
    print("-" * 36)

if __name__ == "__main__":
    test_env_injection()
