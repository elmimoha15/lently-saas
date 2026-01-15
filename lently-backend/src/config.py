from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    # Environment
    environment: str = "development"
    
    # GCP
    gcp_project_id: str
    gcp_region: str = "us-central1"
    
    # Firebase
    firebase_project_id: str
    firebase_service_account_path: str
    
    # APIs
    youtube_api_key: str
    gemini_api_key: str
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    
    # Security
    jwt_secret_key: str
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:8081"
    
    # Paddle Billing
    paddle_webhook_secret: str
    paddle_api_key: str
    paddle_environment: str = "sandbox"
    
    # Rate Limiting
    rate_limit_enabled: bool = True
    
    # Logging
    log_level: str = "INFO"
    
    @property
    def origins_list(self) -> List[str]:
        """Parse comma-separated origins into list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
