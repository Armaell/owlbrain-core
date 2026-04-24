
# @Schedule
This allows scripts to run methods automatically at specific times.

Two ways to write it:

## Using 6-field cron expression:
```ts
@Schedule.cron("0 0 1 * * *")
async generateDailyReport(event: OwlEvent) {
  console.log("Generating daily report…")
}
```

## Using natural language expression:
```ts
@Schedule.text("at 1:00 am")
async generateDailyReport(event: OwlEvent) {
  console.log("Generating daily report…")
}
```

## More examples :
- "every 5 minutes"
- "every day at 3pm"
- "every Monday and Friday at 09:30"
- "every 10 seconds"
- "every hour"
- And more in [later.js documentation](https://breejs.github.io/later/parsers.html#text)
