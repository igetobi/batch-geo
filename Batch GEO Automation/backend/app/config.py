from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    anthropic_api_key: str = ""
    batchgeo_email: str = ""
    batchgeo_password: str = ""
    app_secret: str = "dev-secret"
    team_username: str = "team"
    team_password: str = "change-me"
    nominatim_user_agent: str = "batchgeo-map-generator"
    environment: str = "development"
    # Override the SQLite database location (env: DB_PATH). Empty = use the
    # default app/data/maps.db. Tests set this to an isolated temp file.
    db_path: str = ""
    # Feature flag: set AUTH_ENABLED=true to require the team login.
    # Defaults to False (open access — no login required).
    auth_enabled: bool = False


settings = Settings()


def assert_production_secrets() -> None:
    """Raise RuntimeError if running in production with default/insecure secrets.

    Only enforced when ENVIRONMENT=production.  Development and test runs
    use default secrets and are never affected.

    When auth_enabled is False, TEAM_PASSWORD / APP_SECRET checks are skipped
    because those secrets are only meaningful when auth is on.
    """
    if settings.environment != "production":
        return
    problems: list[str] = []
    if settings.auth_enabled:
        if settings.app_secret == "dev-secret":
            problems.append("APP_SECRET is still set to the default 'dev-secret'")
        if settings.team_password == "change-me":
            problems.append("TEAM_PASSWORD is still set to the default 'change-me'")
    if problems:
        raise RuntimeError(
            "Refusing to start in production with insecure default secrets. "
            "Fix the following environment variables before deploying:\n"
            + "\n".join(f"  - {p}" for p in problems)
        )
