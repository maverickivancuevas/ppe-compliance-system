"""
Detection utilities for PPE compliance checking
"""
from typing import Optional


def calculate_violation_type(
    person_detected: bool,
    hardhat_detected: bool,
    no_hardhat_detected: bool,
    safety_vest_detected: bool,
    no_safety_vest_detected: bool,
    is_compliant: bool
) -> Optional[str]:
    """
    Calculate violation type based on PPE detection results

    Args:
        person_detected: Whether a person was detected
        hardhat_detected: Whether hardhat was detected
        no_hardhat_detected: Whether no hardhat was detected
        safety_vest_detected: Whether safety vest was detected
        no_safety_vest_detected: Whether no safety vest was detected
        is_compliant: Whether the detection is compliant

    Returns:
        Violation type string or None if compliant

    Examples:
        >>> calculate_violation_type(True, False, True, True, False, False)
        'No Hardhat'
        >>> calculate_violation_type(True, False, True, False, True, False)
        'Both Missing'
        >>> calculate_violation_type(True, True, False, True, False, True)
        None
    """
    # If compliant or no person detected, no violation
    if is_compliant or not person_detected:
        return None

    # Determine what PPE is missing based on explicit "no_" flags
    if no_hardhat_detected and no_safety_vest_detected:
        return "Both Missing"
    elif no_hardhat_detected:
        return "No Hardhat"
    elif no_safety_vest_detected:
        return "No Safety Vest"

    # If we reach here, person is not compliant but explicit flags don't indicate violation
    # Infer from what's NOT detected (absence of PPE)
    if not hardhat_detected and not safety_vest_detected:
        return "Both Missing"
    elif not hardhat_detected:
        return "No Hardhat"
    elif not safety_vest_detected:
        return "No Safety Vest"

    # Default to generic violation if we can't determine specific type
    return "PPE Violation"
