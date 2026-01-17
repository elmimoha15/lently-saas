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
    
    # Cloud Pub/Sub
    pubsub_analysis_topic: str = "analysis-jobs"
    pubsub_analysis_subscription: str = "analysis-jobs-worker"
    pubsub_enabled: bool = False  # Set to True when Pub/Sub is configured
    
    # Logging
    log_level: str = "INFO"
    
    @property
    def origins_list(self) -> List[str]:
        """Parse comma-separated origins into list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @property
    def FIREBASE_PROJECT_ID(self) -> str:
        """Alias for firebase_project_id (used by Pub/Sub)"""
        return self.firebase_project_id
    
    @property
    def PUBSUB_ANALYSIS_TOPIC(self) -> str:
        """Alias for pubsub_analysis_topic"""
        return self.pubsub_analysis_topic
    
    @property
    def PUBSUB_ANALYSIS_SUBSCRIPTION(self) -> str:
        """Alias for pubsub_analysis_subscription"""
        return self.pubsub_analysis_subscription
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
