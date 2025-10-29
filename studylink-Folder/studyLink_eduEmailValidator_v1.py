'''
Design

Task: restricting user email to .edu login only

Define inputs, outputs, main steps, and logic.
input: string from keyboard user email
output: boolean if email ends in .edu
steps:Step 1: Read and validate input
Step 2: Confirm if valid email format
Step 3: Confirm if email ends in .edu using regex
Step 4: Return

Write pseudocode
 // Step 1: Read and validate input
    IF email is empty THEN
        PRINT "Empty email address"
        RETURN false
    END IF
    
    // Step 2: Confirm if valid email format
    emailPattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    IF email does NOT match emailPattern THEN
        PRINT "Invalid email format"
        RETURN false
    END IF
    
    // Step 3: Confirm if email ends in .edu using regex
    eduPattern = "\.edu$" (case insensitive)
    IF email does NOT contain eduPattern THEN
        PRINT "Email does not end with .edu"
        RETURN false
    END IF
    
    // Step 4: Return
    PRINT "Valid .edu email"
    RETURN true
END

Label which algorithmic approach you used (e.g., greedy, brute force, DP, divide & conquer). (if applies) 
	Pattern Matching

'''
# IMPLEMENTATION IN PYTHON

import re

def validate_edu_email(email):
    """
    Validates if an email address is a valid .edu email
    
    Args:
        email (str): The email address to validate
        
    Returns:
        bool: True if email is valid and ends with .edu, False otherwise
    """
    
    # Step 1: Basic email validation regex pattern
    # This pattern checks for a valid email format: username@domain.extension
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    # Step 2: Check if email matches basic email format
    if not re.match(email_pattern, email):
        print(f"Invalid email format: {email}")
        return False
    
    # Step 3: Check if email ends with .edu
    edu_pattern = r'\.edu$'
    if not re.search(edu_pattern, email, re.IGNORECASE):
        print(f"Email does not end with .edu: {email}")
        return False
    
    print(f"Valid .edu email: {email}")
    return True

def main():
    """
    Main function to demonstrate email validation
    """
    user_input = input("Enter email address: ").strip()
    if not validate_edu_email(user_input):
        print("Invalid email address")
    else:
        print("Valid email address")


if __name__ == "__main__":
    main()

'''
Design

Task: restricting user email to .edu login only

Define inputs, outputs, main steps, and logic.
input: string from keyboard user email
output: boolean if email ends in .edu
steps:Step 1: Read and validate input
Step 2: Confirm if valid email format
Step 3: Confirm if email ends in .edu using regex
Step 4: Return

Write pseudocode
 // Step 1: Read and validate input
    IF email is empty THEN
        PRINT "Empty email address"
        RETURN false
    END IF
    
    // Step 2: Confirm if valid email format
    emailPattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    IF email does NOT match emailPattern THEN
        PRINT "Invalid email format"
        RETURN false
    END IF
    
    // Step 3: Confirm if email ends in .edu using regex
    eduPattern = "\.edu$" (case insensitive)
    IF email does NOT contain eduPattern THEN
        PRINT "Email does not end with .edu"
        RETURN false
    END IF
    
    // Step 4: Return
    PRINT "Valid .edu email"
    RETURN true
END

Label which algorithmic approach you used (e.g., greedy, brute force, DP, divide & conquer). (if applies) 
	Pattern Matching

'''
# IMPLEMENTATION IN PYTHON

import re

def validate_edu_email(email):
    """
    Validates if an email address is a valid .edu email
    
    Args:
        email (str): The email address to validate
        
    Returns:
        bool: True if email is valid and ends with .edu, False otherwise
    """
    
    # Step 1: Basic email validation regex pattern
    # This pattern checks for a valid email format: username@domain.extension
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    # Step 2: Check if email matches basic email format
    if not re.match(email_pattern, email):
        print(f"Invalid email format: {email}")
        return False
    
    # Step 3: Check if email ends with .edu
    edu_pattern = r'\.edu$'
    if not re.search(edu_pattern, email, re.IGNORECASE):
        print(f"Email does not end with .edu: {email}")
        return False
    
    print(f"Valid .edu email: {email}")
    return True

def main():
    """
    Main function to demonstrate email validation
    """
    user_input = input("Enter email address: ").strip()
    if not validate_edu_email(user_input):
        print("Invalid email address")
    else:
        print("Valid email address")


if __name__ == "__main__":
    main()
