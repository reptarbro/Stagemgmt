# StandBy v4.0: The show goes anywhere

StandBy is the first project I have built and carried all the way to a real
release. I made it from inside the work, using my own ongoing production of
Hedda Gabler as a live testing ground and drawing on the daily reality of stage
managing.

Version 4.0 is the release where StandBy stopped being a notebook on a single
device and became a tool that follows you across all of them.

## What is new
- **Cross-device sync.** A production now moves between iPad, phone, and desktop.
  This was verified live: a full show traveled from an iPad to a desktop with one
  sign in and a single tap.
- **Passwordless sign in.** Continue with Google, or use a one-time email link.
  There is no password to set, forget, or leak.
- **Complete backups.** Export and import carry everything, including the
  uploaded script and sign-in photos, in a single file.
- **A cleaner front door.** The welcome screen is condensed, and the app now
  updates itself on each release instead of getting stuck on a cached version.
- **Availability that fits real life.** Log single days, date ranges, and
  recurring weekly conflicts.

## Under the hood
- **Local first.** Every show still lives on your device and works offline. The
  cloud is an option you turn on, not a requirement.
- **Private by design.** Cloud data is stored per account with row-level
  security, so only the signed-in owner can read their cast and contact details.
- **The stack.** Built with React and TypeScript, synced through Supabase, and
  served as an installable web app.

## What is next
Automatic background sync, archiving for finished shows, and shared productions
so a whole team can work from the same prompt book.
