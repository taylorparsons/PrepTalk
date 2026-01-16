#!/usr/bin/env python3
"""
Automated refactoring script that applies common code improvements.
Uses AST transformations for safe refactoring.
"""

import ast
import astor
import sys
from typing import Optional
from pathlib import Path
import argparse


class RefactoringTransformer(ast.NodeTransformer):
    """AST transformer that applies refactoring rules."""
    
    def __init__(self):
        self.changes_made = []
    
    def visit_Compare(self, node):
        """Transform comparisons with None to use 'is' instead of '=='."""
        self.generic_visit(node)
        
        # Check for: x == None or x != None
        if len(node.ops) == 1 and len(node.comparators) == 1:
            comparator = node.comparators[0]
            
            if isinstance(comparator, ast.Constant) and comparator.value is None:
                if isinstance(node.ops[0], ast.Eq):
                    node.ops[0] = ast.Is()
                    self.changes_made.append("Changed '== None' to 'is None'")
                elif isinstance(node.ops[0], ast.NotEq):
                    node.ops[0] = ast.IsNot()
                    self.changes_made.append("Changed '!= None' to 'is not None'")
        
        return node
    
    def visit_If(self, node):
        """Simplify if-else statements."""
        self.generic_visit(node)
        
        # Transform: if x: return True else: return False -> return x
        if (len(node.body) == 1 and len(node.orelse) == 1 and
            isinstance(node.body[0], ast.Return) and
            isinstance(node.orelse[0], ast.Return)):
            
            body_val = node.body[0].value
            else_val = node.orelse[0].value
            
            # Check for True/False pattern
            if (isinstance(body_val, ast.Constant) and body_val.value is True and
                isinstance(else_val, ast.Constant) and else_val.value is False):
                self.changes_made.append("Simplified if-else to direct return")
                return ast.Return(value=node.test)
            
            elif (isinstance(body_val, ast.Constant) and body_val.value is False and
                  isinstance(else_val, ast.Constant) and else_val.value is True):
                self.changes_made.append("Simplified if-else to negated return")
                return ast.Return(value=ast.UnaryOp(op=ast.Not(), operand=node.test))
        
        return node
    
    def visit_For(self, node):
        """Optimize for loops."""
        self.generic_visit(node)
        
        # Transform: for i in range(len(lst)): x = lst[i] -> for x in lst
        if (isinstance(node.iter, ast.Call) and
            isinstance(node.iter.func, ast.Name) and
            node.iter.func.id == 'range'):
            
            # Check if it's range(len(something))
            if (len(node.iter.args) == 1 and
                isinstance(node.iter.args[0], ast.Call) and
                isinstance(node.iter.args[0].func, ast.Name) and
                node.iter.args[0].func.id == 'len'):
                
                # This is a candidate for simplification
                # (Full implementation would need more context analysis)
                pass
        
        return node


def refactor_code(code: str, filename: str = '<string>') -> tuple[str, list[str]]:
    """
    Apply automated refactorings to code.
    
    Args:
        code: Source code string
        filename: Filename for error reporting
    
    Returns:
        Tuple of (refactored_code, list_of_changes)
    """
    try:
        tree = ast.parse(code, filename=filename)
        transformer = RefactoringTransformer()
        new_tree = transformer.visit(tree)
        ast.fix_missing_locations(new_tree)
        
        refactored = astor.to_source(new_tree)
        return refactored, transformer.changes_made
    
    except SyntaxError as e:
        return code, [f"Syntax error: {e.msg} at line {e.lineno}"]
    except Exception as e:
        return code, [f"Error during refactoring: {str(e)}"]


def refactor_file(filepath: str, in_place: bool = False) -> Optional[str]:
    """
    Refactor a Python file.
    
    Args:
        filepath: Path to file
        in_place: Whether to modify file in place
    
    Returns:
        Refactored code or None if no changes
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original_code = f.read()
        
        refactored_code, changes = refactor_code(original_code, filepath)
        
        if changes:
            print(f"Refactored {filepath}:")
            for change in changes:
                print(f"  • {change}")
            
            if in_place:
                # Backup original
                backup_path = f"{filepath}.bak"
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(original_code)
                print(f"  Backup saved to: {backup_path}")
                
                # Write refactored version
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(refactored_code)
                print(f"  File updated in place")
            else:
                # Write to new file
                output_path = filepath.replace('.py', '_refactored.py')
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(refactored_code)
                print(f"  Refactored version saved to: {output_path}")
            
            return refactored_code
        else:
            print(f"No automated refactorings applied to {filepath}")
            return None
    
    except Exception as e:
        print(f"Error processing {filepath}: {str(e)}")
        return None


def remove_unused_imports(code: str) -> tuple[str, list[str]]:
    """
    Remove unused imports from code.
    
    Args:
        code: Source code string
    
    Returns:
        Tuple of (cleaned_code, list_of_removed_imports)
    """
    try:
        tree = ast.parse(code)
        
        # Collect all imports
        imports = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imports[name] = node
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imports[name] = node
        
        # Find used names
        used_names = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Name):
                used_names.add(node.id)
        
        # Identify unused imports
        unused = [name for name in imports if name not in used_names]
        
        # Remove unused imports (simplified - full implementation would modify AST)
        lines = code.split('\n')
        cleaned_lines = []
        removed = []
        
        for line in lines:
            is_unused = False
            for unused_name in unused:
                if f'import {unused_name}' in line or f'import {unused_name.split(".")[0]}' in line:
                    is_unused = True
                    removed.append(f"Removed unused import: {unused_name}")
                    break
            
            if not is_unused:
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines), removed
    
    except Exception as e:
        return code, [f"Error removing imports: {str(e)}"]

def main():
    """Console entry point for the refactoring tool."""
    parser = argparse.ArgumentParser(
        description="Apply automated refactorings to a Python file",
    )
    parser.add_argument("file", help="Path to the Python file to refactor")
    parser.add_argument(
        "-i",
        "--in-place",
        action="store_true",
        help="Modify the file in place (creates .bak backup)",
    )

    args = parser.parse_args()

    filepath = args.file
    if not Path(filepath).is_file():
        print(f"Error: {filepath} is not a valid file")
        sys.exit(1)

    result = refactor_file(filepath, in_place=args.in_place)

    if result:
        print("\n✅ Refactoring complete!")
    else:
        print("\nℹ️  No changes needed.")


if __name__ == "__main__":
    main()
