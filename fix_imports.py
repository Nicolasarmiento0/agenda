import os
import re

def replace_in_file(filepath, pattern, replacement):
    with open(filepath, 'r') as file:
        content = file.read()
    
    new_content = re.sub(pattern, replacement, content)
    
    if new_content != content:
        with open(filepath, 'w') as file:
            file.write(new_content)
        print(f"Updated {filepath}")

# Update calendar imports that pointed to agenda
calendar_dir = 'components/calendar'
for root, dirs, files in os.walk(calendar_dir):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            # Match imports like from '../agenda/agendaHelpers'
            replace_in_file(filepath, r"from '(.*)/agenda/(.*)'", r"from '\1/calendar/modals/\2'")
            # Sometimes it's just '../agenda/...' from inside calendar
            replace_in_file(filepath, r"from '\.\./agenda/(.*)'", r"from '../modals/\1'")
            replace_in_file(filepath, r"from '\.\./\.\./agenda/(.*)'", r"from '../modals/\1'")

# Update imports inside modals themselves since they moved from components/agenda/ to components/calendar/modals/
# This means they went one directory deeper. So any import starting with '../' needs an extra '../'
modals_dir = 'components/calendar/modals'
for root, dirs, files in os.walk(modals_dir):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            # Find imports like from '../../constants/appointments'
            # We need to prepend '../' to any import that starts with '../' but does NOT point to something inside the modals directory
            # It's easier to just add '../' to all relative imports that go up to components or beyond.
            
            with open(filepath, 'r') as f:
                content = f.read()
                
            # If we see from '../../', we change it to from '../../../'
            # If we see from '../TimeWheelPicker', we change it to from '../../TimeWheelPicker'
            new_content = re.sub(r"from '\.\./\.\./(.*)'", r"from '../../../\1'", content)
            new_content = re.sub(r"from '\.\./(TimeWheelPicker|WorkerAvatar|Sidebar)(.*)'", r"from '../../\1\2'", new_content)
            
            # Since modals used to import from its own subdirectories like './hooks/...', those stay the same!
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
