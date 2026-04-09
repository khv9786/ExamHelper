import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from backend.grading import normalize, check_answer


# normalize
def test_normalize_strips():
    assert normalize('  Hello  ') == 'hello'

def test_normalize_collapses_spaces():
    assert normalize('a  b\tc') == 'a b c'

def test_normalize_lowercase():
    assert normalize('SELECT') == 'select'


# 단일 정답
def test_single_exact():
    assert check_answer('RAID', 'RAID') is True

def test_single_case_insensitive():
    assert check_answer('RAID', 'raid') is True

def test_single_wrong():
    assert check_answer('RAID', 'RAID 0') is False

def test_no_answer():
    assert check_answer(None, 'anything') is False

def test_empty_stored():
    assert check_answer('', 'anything') is False


# 파이프 복수정답
def test_pipe_first_option():
    assert check_answer('SELECT|select', 'SELECT') is True

def test_pipe_second_option():
    assert check_answer('SELECT|select', 'select') is True

def test_pipe_normalized():
    assert check_answer(' A | B ', 'b') is True

def test_pipe_wrong():
    assert check_answer('A|B', 'C') is False


# JSON 배열 복수정답
def test_json_array_match():
    assert check_answer('["캡슐화", "encapsulation"]', '캡슐화') is True

def test_json_array_case():
    assert check_answer('["Encapsulation", "캡슐화"]', 'encapsulation') is True

def test_json_array_wrong():
    assert check_answer('["A", "B"]', 'C') is False


if __name__ == '__main__':
    import traceback
    tests = [v for k, v in list(globals().items()) if k.startswith('test_')]
    passed = failed = 0
    for t in tests:
        try:
            t()
            print(f'  PASS  {t.__name__}')
            passed += 1
        except Exception:
            print(f'  FAIL  {t.__name__}')
            traceback.print_exc()
            failed += 1
    print(f'\n{passed} passed, {failed} failed')
