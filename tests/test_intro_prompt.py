from app.services import interview_service


class _Record:
    def __init__(self, role_title):
        self.role_title = role_title


def test_intro_prompt_avoids_confirmation_language():
    prompt_with_role = interview_service._build_intro_prompt(_Record("Principal PM"))
    prompt_without_role = interview_service._build_intro_prompt(_Record(""))

    for prompt in (prompt_with_role, prompt_without_role):
        lowered = prompt.lower()
        assert "do not ask the candidate to confirm readiness or the role" in lowered
        assert "confirm the role before proceeding" not in lowered
        assert "confirm that you're ready" not in lowered
