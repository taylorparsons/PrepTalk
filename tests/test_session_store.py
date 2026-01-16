import time

from app.services.store import InterviewStore


def test_session_store_persists(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='abc123',
        adapter='mock',
        role_title='Recruiter',
        questions=['Q1'],
        focus_areas=['Focus'],
        resume_text='Resume text',
        job_text='Job text',
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
    assert 'Last coach prompt: Welcome' in loaded.live_memory
    assert 'Transcript:' in loaded.live_memory
    assert 'Coach: Welcome' in loaded.live_memory
    assert loaded.score['overall_score'] == 90
    assert loaded.resume_text == 'Resume text'
    assert loaded.job_text == 'Job text'
    assert loaded.question_statuses[0]['status'] == 'not_started'



def test_session_store_persists_live_resume_metadata(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='resume123',
        adapter='mock',
        role_title='Engineer',
        questions=['Q1'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )

    store.set_live_resume_token(
        record.interview_id,
        token='auth_tokens/test-token',
        model='gemini-2.5-flash-live',
        user_id='candidate-1'
    )
    store.set_live_resume_handle(
        record.interview_id,
        handle='resume-handle-1',
        resumable=True,
        user_id='candidate-1'
    )

    reloaded = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    loaded = reloaded.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.live_resume_token == 'auth_tokens/test-token'
    assert loaded.live_resume_handle == 'resume-handle-1'
    assert loaded.live_resume_resumable is True
    assert loaded.live_model == 'gemini-2.5-flash-live'

    store.reset_session(record.interview_id, user_id='candidate-1')
    reloaded = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    loaded = reloaded.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.live_resume_token is None
    assert loaded.live_resume_handle is None
    assert loaded.live_resume_resumable is None
    assert loaded.live_model is None


def test_session_store_tracks_session_name_versions(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='name123',
        adapter='mock',
        role_title='Engineer',
        questions=['Q1'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )

    store.set_session_name(record.interview_id, 'Session One', user_id='candidate-1')
    store.set_session_name(record.interview_id, 'Session Two', user_id='candidate-1')

    reloaded = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    loaded = reloaded.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.session_name_history[-1]['name'] == 'Session Two'
    assert len(loaded.session_name_history) == 2


def test_session_store_inserts_custom_question(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='custom123',
        adapter='mock',
        role_title='Engineer',
        questions=['Q1', 'Q2', 'Q3'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )

    store.add_custom_question(
        record.interview_id,
        question='Custom question',
        position=2,
        user_id='candidate-1'
    )

    reloaded = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    loaded = reloaded.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.questions == ['Q1', 'Custom question', 'Q2', 'Q3']
    assert loaded.custom_questions[0]['position'] == 2
    assert len(loaded.question_statuses) == 4


def test_session_store_reset_clears_transcript_and_score(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='reset123',
        adapter='mock',
        role_title='Engineer',
        questions=['Q1'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )

    store.update_transcript(
        record.interview_id,
        [{'role': 'coach', 'text': 'Welcome', 'timestamp': '00:00'}],
        user_id='candidate-1'
    )
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

    store.reset_session(record.interview_id, user_id='candidate-1')

    reloaded = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    loaded = reloaded.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.transcript == []
    assert loaded.live_memory == ''
    assert loaded.score is None



def test_session_store_merges_transcript_entries(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='merge123',
        adapter='mock',
        role_title='Engineer',
        questions=['Q1'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )

    store.append_transcript_entry(
        record.interview_id,
        {'role': 'candidate', 'text': 'I', 'timestamp': '19:01:41'},
        user_id='candidate-1'
    )
    store.append_transcript_entry(
        record.interview_id,
        {'role': 'candidate', 'text': 'am', 'timestamp': '19:01:42'},
        user_id='candidate-1'
    )
    store.append_transcript_entry(
        record.interview_id,
        {'role': 'candidate', 'text': 'wha', 'timestamp': '19:01:42'},
        user_id='candidate-1'
    )
    store.append_transcript_entry(
        record.interview_id,
        {'role': 'candidate', 'text': 't', 'timestamp': '19:01:43'},
        user_id='candidate-1'
    )

    reloaded = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    loaded = reloaded.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.transcript == [
        {'role': 'candidate', 'text': 'I am what', 'timestamp': '19:01:41'}
    ]


def test_question_status_updates_and_history(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='status123',
        adapter='mock',
        role_title='Engineer',
        questions=['Q1', 'Q2'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )

    entry = store.update_question_status(
        record.interview_id,
        0,
        'started',
        user_id='candidate-1',
        source='auto'
    )
    assert entry is not None
    assert store.get(record.interview_id, user_id='candidate-1').asked_question_index == 0

    store.update_question_status(
        record.interview_id,
        0,
        'answered',
        user_id='candidate-1',
        source='user'
    )
    store.update_question_status(
        record.interview_id,
        0,
        'started',
        user_id='candidate-1',
        source='auto'
    )

    reloaded = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    loaded = reloaded.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.question_statuses[0]['status'] == 'answered'
    assert loaded.question_status_history[-1]['status'] == 'answered'
    assert loaded.question_status_history[-1]['source'] == 'user'
    assert loaded.question_status_history[-1]['timestamp']
    assert loaded.asked_question_index == 0


def test_session_store_updates_updated_at(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    record = store.create(
        interview_id='updated123',
        adapter='mock',
        role_title='Engineer',
        questions=['Q1'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )
    first_updated = record.updated_at

    time.sleep(0.001)
    store.set_session_name(record.interview_id, 'Session One', user_id='candidate-1')

    loaded = store.get(record.interview_id, user_id='candidate-1')
    assert loaded is not None
    assert loaded.updated_at != first_updated


def test_session_store_lists_sessions_ordered_by_updated_at(tmp_path):
    store = InterviewStore(base_dir=tmp_path, default_user_id='tester')
    first = store.create(
        interview_id='first123',
        adapter='mock',
        role_title='Engineer',
        questions=['Q1'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )
    time.sleep(0.001)
    second = store.create(
        interview_id='second123',
        adapter='mock',
        role_title='PM',
        questions=['Q1'],
        focus_areas=['Focus'],
        user_id='candidate-1'
    )

    time.sleep(0.001)
    store.set_session_name(first.interview_id, 'Session One', user_id='candidate-1')

    sessions = store.list_sessions(user_id='candidate-1')
    ids = [entry.interview_id for entry in sessions]
    assert ids[0] == first.interview_id
    assert ids[1] == second.interview_id
