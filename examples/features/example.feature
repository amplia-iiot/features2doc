# Feature category

@tagid

Feature: Withdraw Cash
  This feature allows an account holder to withdraw
  cash from an ATM. 

  # The background lists a set of assumptions that
  # will be applied to each scenario and scenario
  # outline declared in this feature. Just like the
  # Feature declaration, the description is optional
  # and can be any arbitrary text.
  Background:
    These are the assumptions that we are making 
    for the following scenarios:

    * I have $200 in my account
    * There is $500 in the ATM

  # Each scenario tests the feature using a specific
  # set of conditions. Scenarios must start with a
  # title just like below and can optionally be followed
  # by any arbitrary piece of text.
  Scenario: Withdraw without typing the write PIN
    This scenario checks whether the Withdraw Cash feature
    has any security checks in place before dispensing
    the cash to the user.

    Given I did not input my correct PIN
     When I try to withdraw $200 from my account
     Then the ATM should display "You did not input the correct PIN"
      And the ATM should not dispense any amount

  # Scenario outlines allow you to repeat scenarios using
  # varying parameters. Like scenarios, you can also add
  # arbitrary text directly below the declaration
  Scenario Outline: Withdraw cash
    This scenario checks whether the ATM will dispense
    the correct amount and complain if an incorrect amount
    is given by the user.

    Given I typed in my correct PIN
     When I try to withdraw <Requested Amount> from my account
     Then the ATM should dispense <Dispensed Amount>

    Examples:
     | Requested Amount | Dispensed Amount |
     | $200             | $200             |
     | $900             |   $0             |