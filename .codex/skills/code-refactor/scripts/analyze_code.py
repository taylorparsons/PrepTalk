#!/usr/bin/env python3
"""
Code analyzer that detects refactoring opportunities.
Analyzes Python code for common issues and improvement areas.
"""

import ast
import sys
from typing import List, Dict, Any
from pathlib import Path
import argparse

class RefactoringAnalyzer(ast.NodeVisitor):
    """AST visitor that identifies refactoring opportunities."""
    
    def __init__(self, filename: str):
        self.filename = filename
        self.issues: List[Dict[str, Any]] = []
        self.current_function = None
        self.function_complexity = {}
        
    def visit_FunctionDef(self, node):
        """Analyze function definitions."""
        self.current_function = node.name
        
        # Check function length
        func_lines = node.end_lineno - node.lineno + 1
        if func_lines > 50:
            self.issues.append({
                'type': 'long_function',
                'severity': 'medium',
                'line': node.lineno,
                'function': node.name,
                'length': func_lines,
                'message': f"Function '{node.name}' is {func_lines} lines long. Consider breaking it into smaller functions."
            })
        
        # Check parameter count
        param_count = len(node.args.args)
        if param_count > 5:
            self.issues.append({
                'type': 'too_many_parameters',
                'severity': 'low',
                'line': node.lineno,
                'function': node.name,
                'param_count': param_count,
                'message': f"Function '{node.name}' has {param_count} parameters. Consider using a config object or builder pattern."
            })
        
        # Check for missing docstring
        if not ast.get_docstring(node):
            self.issues.append({
                'type': 'missing_docstring',
                'severity': 'low',
                'line': node.lineno,
                'function': node.name,
                'message': f"Function '{node.name}' is missing a docstring."
            })
        
        self.generic_visit(node)
        self.current_function = None
    
    def visit_If(self, node):
        """Check for deeply nested conditionals."""
        depth = self._get_nesting_depth(node)
        if depth > 3:
            self.issues.append({
                'type': 'deep_nesting',
                'severity': 'medium',
                'line': node.lineno,
                'depth': depth,
                'message': f"Deeply nested conditional (depth {depth}). Consider extracting to separate functions or using early returns."
            })
        self.generic_visit(node)
    
    def visit_For(self, node):
        """Check for complex loops."""
        # Check if loop body is too long
        if hasattr(node, 'body') and len(node.body) > 20:
            self.issues.append({
                'type': 'complex_loop',
                'severity': 'medium',
                'line': node.lineno,
                'message': "Loop body is complex. Consider extracting the loop body into a separate function."
            })
        self.generic_visit(node)
    
    def visit_Try(self, node):
        """Check exception handling."""
        # Check for bare except
        for handler in node.handlers:
            if handler.type is None:
                self.issues.append({
                    'type': 'bare_except',
                    'severity': 'high',
                    'line': handler.lineno,
                    'message': "Bare except clause catches all exceptions. Specify exception types."
                })
        self.generic_visit(node)
    
    def visit_ClassDef(self, node):
        """Analyze class definitions."""
        # Count methods
        methods = [n for n in node.body if isinstance(n, ast.FunctionDef)]
        if len(methods) > 15:
            self.issues.append({
                'type': 'large_class',
                'severity': 'medium',
                'line': node.lineno,
                'class': node.name,
                'method_count': len(methods),
                'message': f"Class '{node.name}' has {len(methods)} methods. Consider splitting responsibilities."
            })
        
        # Check for missing docstring
        if not ast.get_docstring(node):
            self.issues.append({
                'type': 'missing_docstring',
                'severity': 'low',
                'line': node.lineno,
                'class': node.name,
                'message': f"Class '{node.name}' is missing a docstring."
            })
        
        self.generic_visit(node)
    
    def _get_nesting_depth(self, node, depth=0):
        """Calculate nesting depth of conditionals."""
        max_depth = depth
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.With)):
                child_depth = self._get_nesting_depth(child, depth + 1)
                max_depth = max(max_depth, child_depth)
        return max_depth


def analyze_file(filepath: str) -> List[Dict[str, Any]]:
    """
    Analyze a Python file for refactoring opportunities.
    
    Args:
        filepath: Path to Python file
    
    Returns:
        List of issues found
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            code = f.read()
        
        tree = ast.parse(code, filename=filepath)
        analyzer = RefactoringAnalyzer(filepath)
        analyzer.visit(tree)
        
        return analyzer.issues
    
    except SyntaxError as e:
        return [{
            'type': 'syntax_error',
            'severity': 'critical',
            'line': e.lineno,
            'message': f"Syntax error: {e.msg}"
        }]
    except Exception as e:
        return [{
            'type': 'error',
            'severity': 'critical',
            'line': 0,
            'message': f"Error analyzing file: {str(e)}"
        }]


def analyze_directory(directory: str, recursive: bool = True) -> Dict[str, List[Dict[str, Any]]]:
    """
    Analyze all Python files in a directory.
    
    Args:
        directory: Path to directory
        recursive: Whether to search recursively
    
    Returns:
        Dictionary mapping filenames to issues
    """
    path = Path(directory)
    pattern = '**/*.py' if recursive else '*.py'
    
    results = {}
    for filepath in path.glob(pattern):
        if filepath.is_file():
            issues = analyze_file(str(filepath))
            if issues:
                results[str(filepath)] = issues
    
    return results


def generate_report(results: Dict[str, List[Dict[str, Any]]]) -> str:
    """Generate a formatted report of issues."""
    report = []
    report.append("=" * 70)
    report.append("CODE REFACTORING ANALYSIS REPORT")
    report.append("=" * 70)
    report.append("")
    
    # Count issues by severity
    severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    total_issues = 0
    
    for filepath, issues in results.items():
        for issue in issues:
            severity_counts[issue['severity']] += 1
            total_issues += 1
    
    # Summary
    report.append(f"Total files analyzed: {len(results)}")
    report.append(f"Total issues found: {total_issues}")
    report.append("")
    report.append("Issues by severity:")
    report.append(f"  Critical: {severity_counts['critical']}")
    report.append(f"  High:     {severity_counts['high']}")
    report.append(f"  Medium:   {severity_counts['medium']}")
    report.append(f"  Low:      {severity_counts['low']}")
    report.append("")
    report.append("=" * 70)
    report.append("")
    
    # Detailed issues
    for filepath, issues in sorted(results.items()):
        report.append(f"FILE: {filepath}")
        report.append("-" * 70)
        
        for issue in sorted(issues, key=lambda x: (x['line'], x['severity'])):
            severity_symbol = {
                'critical': '🔴',
                'high': '🟠',
                'medium': '🟡',
                'low': '🔵'
            }[issue['severity']]
            
            report.append(f"{severity_symbol} Line {issue['line']}: {issue['message']}")
        
        report.append("")
    
    return "\n".join(report)

def main():
    """Console entry point for the code analyzer."""
    parser = argparse.ArgumentParser(
        description="Analyze Python files or directories for refactoring opportunities",
    )
    parser.add_argument(
        "target",
        help="Path to a Python file or directory to analyze",
    )
    parser.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="Recursively analyze directories",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="refactoring_report.txt",
        help="Path to write the analysis report (default: refactoring_report.txt)",
    )

    args = parser.parse_args()

    path = Path(args.target)

    if path.is_file():
        issues = analyze_file(str(path))
        results = {str(path): issues} if issues else {}
    elif path.is_dir():
        results = analyze_directory(str(path), recursive=args.recursive)
    else:
        print(f"Error: {args.target} is not a valid file or directory")
        sys.exit(1)

    if results:
        report = generate_report(results)
        print(report)

        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"\nReport saved to: {args.output}")
    else:
        print("No issues found! ✨ Code looks good.")


if __name__ == "__main__":
    main()
