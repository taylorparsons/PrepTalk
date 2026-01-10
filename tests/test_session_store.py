from app.services.store import InterviewStore


def test_session_store_persists(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='abc123',
        adapter='mock',
        role_title='Recruiter',
        questions=['Q1'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )

    entry = {'role': 'coach', 'text': 'Welcome', 'timestamp': '00:00'}
    store.append_transcript_entry(record.interview_id, entry, user_id='candidate-1')
    store.set_score(
        record.interview_id,
        {
            'overall_score': 90,
            'summary': 'Solid answers',
            'strengths': ['Clarity'],
            'improvements': ['Add metrics']
        },
        user_id='candidate-1'
    )

    path = tmp_path / 'candidate-1' / f'{record.interview_id}.json'
    assert path.exists()

    reloaded = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    loaded = reloaded.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.transcript[0]['text'] == 'Welcome'
    assert loaded.score['overall_score'] == 90
