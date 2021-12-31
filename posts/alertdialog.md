---
title: HTML5's role="alertdialog"
description:
slug: alertdialog
date: Nov 16, 2021
published: false
---

While trying to improve the dialogs in [The Lounge](https://github.com/thelounge/thelounge), I came across this page on MDN: [Using the alertdialog role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_alertdialog_role).

The part that jumped out to me is the following: 
> The difference with regular dialogs is that the `alertdialog` role should only be used when an alert, error, or warning occurs. In other words, when a dialog's information and controls require the user's immediate attention `alertdialog` should be used instead of `dialog`.

This means that every modal-like element I've seen should be an `alertdialog`. In the few I've worked with, they've always had the `role="dialog"` aria tag (or worse, no tag at all). Googling for `alertdialog` returns few results, with most referencing an Android component. 

GitHub (who I believe often publishes accessible websites) uses the standard dialog role, so I don't feel like it's very well known. 

![Screenshot of the HTML inspector showing role="dialog" on a GitHub modal requiring user input (deleting a repository)](/blog/alertdialog/github2.png)

Twitter does the same thing. When posting a tweet, the modal is an element with `role="dialog"`. 