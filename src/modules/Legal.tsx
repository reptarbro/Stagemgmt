import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { StandbyMark, APP_NAME } from '../components/Brand'

/** Human-readable "last updated" — bump when the text below changes. */
const UPDATED = 'July 8, 2026'
/** Where people reach a human about privacy or these terms. */
const CONTACT = 'Tiffany@directpromos.com'

/** Shared centered, scrollable shell for the standalone legal pages. */
function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="welcome-scroll">
      <div className="welcome-center" style={{ alignItems: 'stretch' }}>
        <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
          <Link
            to="/"
            className="brand"
            style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', gap: 10, alignItems: 'center' }}
          >
            <StandbyMark size={30} />
            <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {APP_NAME}
            </span>
          </Link>

          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>{title}</h1>
          <p className="muted" style={{ marginTop: 0 }}>Last updated {UPDATED}</p>

          <div className="legal-body">{children}</div>

          <div className="row" style={{ gap: 16, marginTop: 28, flexWrap: 'wrap' }}>
            <Link to="/">← Back to {APP_NAME}</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {APP_NAME} is a digital prompt book for stage managers. This policy explains what data the app
        handles and how. The guiding principle is simple: <strong>your data is yours</strong>, it stays
        on your device by default, and it only leaves your device if you choose to sign in for cloud
        sync.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>{APP_NAME} works entirely on your device. Nothing is sent anywhere unless you sign in.</li>
        <li>If you sign in, your data syncs to your own private account so you can use it on more than one device.</li>
        <li>We do not sell your data, show ads, or track you across the web.</li>
        <li>You can export everything, and you can delete your cloud data and account at any time.</li>
      </ul>

      <h2>What data the app handles</h2>
      <p>There are two kinds of data:</p>
      <p>
        <strong>1. Your account.</strong> If you sign in, we store the email address associated with
        your sign-in (email magic link or Google) so we can give you a private account and sync your
        data to it. That is the only personal detail we hold about <em>you</em> as the account holder.
      </p>
      <p>
        <strong>2. The production information you enter.</strong> This is the content of your prompt
        book, and it is entirely up to you what goes in it. It can include: show details; cast, crew and
        creative contacts (names, roles, characters, email addresses, phone numbers, emergency contact
        names and numbers, and notes); availability and attendance; schedules; scenes, props, line
        notes, reports and cues; an uploaded script document; and photos or scans of signed sign-in
        sheets. Some of this is personal information about <em>other people</em> — see "Information
        about other people" below.
      </p>

      <h2>Where your data is stored</h2>
      <ul>
        <li>
          <strong>On your device</strong> (in your browser's local storage and its local database).
          This is always where your working copy lives.
        </li>
        <li>
          <strong>In your private cloud account</strong>, only if you sign in. Cloud storage and
          authentication are provided by <strong>Supabase</strong>, our data processor. Your data is
          protected by row-level security so that each account can only read and write its own data.
          Uploaded files (your script, signed sign-in sheets) are kept in a private storage area tied to
          your account.
        </li>
      </ul>

      <h2>How your data is used</h2>
      <p>
        Only to run the app for you: to store your prompt book, sync it between your devices, and let you
        sign in. We do not use it for advertising, we do not sell or rent it, and we do not use
        third-party analytics or cross-site trackers.
      </p>

      <h2>Sign-in</h2>
      <p>
        Sign-in is passwordless. You can use an email magic link or "Continue with Google." When you use
        Google, Google shares your email address with us so we can identify your account; we do not
        receive your Google password. Authentication is handled through Supabase.
      </p>

      <h2>Information about other people</h2>
      <p>
        Because {APP_NAME} is a tool for running a show, the production data you enter will usually
        include personal information about your cast and crew, including emergency contacts. When you
        add that information you are responsible for having a proper basis to hold it, for telling those
        people that their details are kept in your prompt book, and for handling their information
        responsibly. If someone in your company asks you to update or remove their details, you can edit
        or delete them directly in the app.
      </p>

      <h2>Your rights and choices</h2>
      <ul>
        <li><strong>Export:</strong> Settings → Export a complete backup of everything, as a single file.</li>
        <li><strong>Delete a production:</strong> remove a show and all of its contents from your device.</li>
        <li>
          <strong>Delete your cloud data and account:</strong> Settings → Cloud Sync →
          "Delete account &amp; cloud data" permanently removes your cloud copy, your uploaded files, and
          your account. Your local copy on the device stays unless you clear it.
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Your data is kept for as long as you keep it. Local data remains until you delete it or clear
        your browser. Cloud data remains until you delete it or delete your account, at which point it is
        removed from our systems.
      </p>

      <h2>Security</h2>
      <p>
        We use row-level security and private, per-account storage, and data is encrypted in transit. No
        method of storage or transmission is ever completely secure, so we cannot guarantee absolute
        security, but we work to protect your information.
      </p>

      <h2>Children</h2>
      <p>
        {APP_NAME} is a tool for stage managers and is not directed to children. A production may include
        information about minors in its cast; that information is entered and controlled by you as the
        stage manager, under your responsibility as described above.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the app grows. Material changes will be reflected by the "last
        updated" date at the top of this page.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalPage>
  )
}

export function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms cover your use of {APP_NAME}, a digital prompt book for stage managers. By using the
        app you agree to them. Please also read our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What {APP_NAME} is</h2>
      <p>
        {APP_NAME} helps you keep a show's contacts, schedule, scenes, props, line notes, reports and
        cues in one place. It works on your device and can optionally sync to a private cloud account.
        The app is currently offered free of charge and is under active development, so features may
        change.
      </p>

      <h2>Your account and your responsibilities</h2>
      <ul>
        <li>Provide an accurate email address when you sign in, and keep access to it secure.</li>
        <li>
          You are responsible for the information you enter, including personal information about other
          people, and for having a proper basis to store and use it.
        </li>
        <li>
          Keep your own backups of anything important. Settings → Export saves a complete copy. You are
          responsible for your data.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Use {APP_NAME} lawfully and for its intended purpose. Do not use it to store unlawful content,
        to infringe others' rights, or to attempt to break, overload, or gain unauthorized access to the
        service or other accounts.
      </p>

      <h2>Availability and "as is"</h2>
      <p>
        The app is provided "as is" and "as available," without warranties of any kind. We do not
        guarantee that it will be uninterrupted, error-free, or that data synced to the cloud can never
        be lost. This is why local-first storage and exportable backups exist — please use them.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {APP_NAME} and its maker are not liable for any indirect,
        incidental, or consequential damages, or for any loss of data, arising from your use of the app.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may update these terms as the app evolves; the "last updated" date reflects the current
        version. You may stop using {APP_NAME} at any time and delete your account and data from within
        the app.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalPage>
  )
}
