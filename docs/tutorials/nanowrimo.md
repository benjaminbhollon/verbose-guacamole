# VerbGuac and NaNoWriMo

Verbose Guacamole was originally created with National Novel Writing Month—NaNoWriMo for short—in mind. As such, it has a number of useful features to help you hit your word count goals.

## What is NaNoWriMo?

NaNoWriMo is an event each November where participants attempt to write a 50,000-word novel in 30 days. Behind it is the idea that even writing 50,000 bad words is useful, since it helps you iron out plot and get ideas down, with the option to go back later if you find your idea worth the time.

You can find out more about NaNoWriMo on the official website, [nanowrimo.org](https://nanowrimo.org).

## Features built for Nanowrimo

### Word Sprints
Verbose Guacamole has a built-in tool for word sprints! The idea behind word sprints is to set a time and see how much you can write in that time.

To try it out, click the icon with a running person on the right side of the Novel Stats bar, beside the total wordcount.

### Word Goals
If you click on your project's word count, you'll be displayed a neat little popup where you can set word count goals.

As you write, a progress bar will fill in the background of the word count. It tracks your progress toward the goal you're closest to reaching, but you can view your progress toward other goals by clicking to open the popup.

#### Session Goals
Session goals only last until you close Verbose Guacamole (NOTE: opening and closing a project or refreshing the page [ctrl+r] will also end session goals). You'll generally want to use them if you have a certain threshold you want to reach before doing something else.

Session goals begin counting from the moment of creation and will overlap with any other goals, no matter the type. For example, 300 words toward a session goal can still count toward your 500-word daily goal.

#### Daily Goals
Daily goals reset each day, challenging you to maintain a consistent writing amount. For NaNoWriMo, you'll likely want to set a daily goal of 1,667 words. If you hit that goal every day for the month, you'll hit 50,000!

Daily goals begin counting when you create them (i.e., if you've already written 100 words on the day you create the goal, they won't count toward that day), but they reset each day. VerbGuac keeps track of how many days you hit your goal (days you do not open the project do not count against you). Daily goals overlap with other goals, no matter the type, so having two daily goals at once, while possible, is not likely to be useful as the same words count toward both goals.

#### Project Goals
Project goals keep track of your total word count. They are not dependent on when you create them; whatever number is shown as your total word count is your progress toward them. If you are participating in NaNoWriMo, you will likely want to create a 50,000 word goal.

Project goals do not have a time limit, though such a feature may be added in the future.

When you complete a Project Goal, a modal pops up to congratulate you, while for other goal types the progress bar merely flashes until you click it. We made this decision because meeting a Project Goal is usually a more significant achievement worthy of interrupting your train of thought. In the future, we will likely add some more congratulatory embellishments, such as confetti and/or a fanfare.

## Git Committing Strategies
One of Verbose Guacamole's most powerful an unique features is its Git integration. This integration allows you to view and even restore past versions of you project on a whim (and of course, you can always revert the restoration).

This section will discuss strategies for committing which might be useful during NaNoWriMo.

### Daily Commits
With this strategy, you'd create a commit each day when you finish writing.

**Pros:**

- Not much thought required to decide on logical breaking points
- When going back to edit, you can easily see the progression over time

**Cons:**

- Since the commits aren't broken up logically according to the plot, you may not be able to find a good commit to restore to
- It's hard to know which commit exactly you're looking for; you might have to check each one (this could be remedied by including a short description of what you've done in your commit message as opposed to just a date)

### Per Plot Point
If you've created an outline for your novel, it might be a good idea to create a new commit after each bullet point you complete.

**Pros:**

-
