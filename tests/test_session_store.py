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
    assert loaded.score['overall_score'] == 90
    assert loaded.resume_text == 'Resume text'
    assert loaded.job_text == 'Job text'



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
