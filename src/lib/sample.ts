import { newId } from './storage'
import type { Production } from './types'

/** ISO date offset from today (local), so the demo always has past + upcoming. */
function iso(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * A fully-populated example production so the app looks alive in a demo with
 * one tap. Uses fresh ids and relative dates each time it's created.
 */
export function makeSampleProduction(): Production {
  // People ---------------------------------------------------------------
  const puck = newId()
  const oberon = newId()
  const titania = newId()
  const hermia = newId()
  const lysander = newId()
  const sm = newId()
  const asm = newId()
  const ld = newId()

  const people = [
    { id: puck, group: 'Cast' as const, name: 'Robin Okafor', role: 'Actor', character: 'Puck',
      email: 'robin@example.com', phone: '(212) 555-0142',
      emergencyContactName: 'M. Okafor', emergencyContactPhone: '(212) 555-0199',
      conflicts: [{ id: newId(), date: iso(4), note: 'Film shoot' }] },
    { id: oberon, group: 'Cast' as const, name: 'Daniel Reyes', role: 'Actor', character: 'Oberon',
      email: 'daniel@example.com', phone: '(212) 555-0177', conflicts: [] },
    { id: titania, group: 'Cast' as const, name: 'Aisha Bello', role: 'Actor', character: 'Titania',
      email: 'aisha@example.com', phone: '(212) 555-0110', conflicts: [] },
    { id: hermia, group: 'Cast' as const, name: 'Grace Lin', role: 'Actor', character: 'Hermia',
      email: 'grace@example.com', phone: '(212) 555-0121', conflicts: [] },
    { id: lysander, group: 'Cast' as const, name: 'Tom Fisher', role: 'Actor', character: 'Lysander',
      email: 'tom@example.com', phone: '(212) 555-0133', conflicts: [] },
    { id: sm, group: 'Production' as const, name: 'Tiffany Rex', role: 'Stage Manager',
      email: 'tiffany@example.com', phone: '(212) 555-0100', conflicts: [] },
    { id: asm, group: 'Production' as const, name: 'Jordan Amel', role: 'Assistant Stage Manager',
      email: 'jordan@example.com', phone: '(212) 555-0104', conflicts: [] },
    { id: ld, group: 'Creative' as const, name: 'Sam Ito', role: 'Lighting Designer',
      email: 'sam@example.com', phone: '(212) 555-0108', conflicts: [] },
  ]

  // Events + attendance --------------------------------------------------
  const ev1 = newId()
  const ev2 = newId()
  const events = [
    { id: ev1, type: 'Rehearsal' as const, title: 'Act 1 blocking', date: iso(-6),
      callTime: '18:30', startTime: '19:00', endTime: '22:00', location: 'Rehearsal Rm B',
      calledPersonIds: [puck, oberon, titania], notes: 'Off-book for scene 1.' },
    { id: ev2, type: 'Rehearsal' as const, title: 'Lovers — Act 2', date: iso(-2),
      callTime: '18:30', startTime: '19:00', endTime: '22:00', location: 'Rehearsal Rm B',
      calledPersonIds: [hermia, lysander, puck], notes: '' },
    { id: newId(), type: 'Tech' as const, title: 'Tech / dry run', date: iso(5),
      callTime: '12:00', startTime: '13:00', endTime: '18:00', location: 'Main Stage',
      calledPersonIds: [], notes: 'Whole company + crew.' },
    { id: newId(), type: 'Performance' as const, title: 'Opening night', date: iso(10),
      callTime: '18:00', startTime: '19:30', endTime: '22:00', location: 'Main Stage',
      calledPersonIds: [], notes: '' },
    { id: newId(), type: 'Performance' as const, title: 'Matinee', date: iso(12),
      callTime: '12:30', startTime: '14:00', endTime: '16:30', location: 'Main Stage',
      calledPersonIds: [], notes: '' },
  ]

  const attendance = [
    { eventId: ev1, records: {
      [puck]: { status: 'present' as const },
      [oberon]: { status: 'late' as const, note: 'Train delay' },
      [titania]: { status: 'present' as const },
    } },
    { eventId: ev2, records: {
      [hermia]: { status: 'present' as const },
      [lysander]: { status: 'present' as const },
      [puck]: { status: 'excused' as const, note: 'Approved absence' },
    } },
  ]

  // Scenes ---------------------------------------------------------------
  const scenes = [
    { id: newId(), number: '1.1', title: "The court", page: '1–8', characterIds: [oberon, titania],
      synopsis: 'The quarrel over the changeling boy.', notes: '' },
    { id: newId(), number: '2.1', title: 'The wood', page: '9–16', characterIds: [puck, oberon],
      synopsis: 'Oberon sends Puck for the flower.', notes: 'Fog cue here.' },
    { id: newId(), number: '2.2', title: 'The lovers', page: '17–24', characterIds: [hermia, lysander, puck],
      synopsis: 'The potion goes to the wrong eyes.', notes: '' },
  ]

  // Props / costumes -----------------------------------------------------
  const props = [
    { id: newId(), name: "Love-in-idleness flower", category: 'Prop' as const, sceneRef: '2.1',
      usedByPersonIds: [oberon, puck], status: 'Ready' as const, notes: 'Glows under UV.' },
    { id: newId(), name: "Titania's bower", category: 'Set' as const, sceneRef: '2.2',
      usedByPersonIds: [titania], status: 'In progress' as const, notes: '' },
    { id: newId(), name: "Puck's cap & bells", category: 'Costume' as const, sceneRef: 'All',
      usedByPersonIds: [puck], status: 'Needed' as const, notes: 'Fitting Thursday.' },
  ]

  // Line notes -----------------------------------------------------------
  const lineNotes = [
    { id: newId(), date: iso(-2), personId: lysander, location: 'p. 18', type: 'paraphrased' as const,
      note: '"gentle" → "gentler"', resolved: false },
    { id: newId(), date: iso(-2), personId: hermia, location: 'p. 21', type: 'dropped' as const,
      note: 'Skipped the "I frown upon him" line.', resolved: true },
  ]

  // A filed report -------------------------------------------------------
  const reports = [
    { id: newId(), type: 'Rehearsal' as const, date: iso(-2), eventId: ev2,
      summary: 'Blocked Act 2 lovers. Strong pass; a few line bobbles noted.',
      workedOn: '2.2 in full, ~2h45 including a 10-min break.',
      sections: [
        { id: newId(), title: 'Scenic / Props', notes: [
          { id: newId(), text: 'Need the smaller bower footprint for the wood.' },
        ] },
        { id: newId(), title: 'Lighting', notes: [
          { id: newId(), text: 'Confirm UV wash timing for the flower reveal.' },
        ] },
        { id: newId(), title: 'Stage Management', notes: [
          { id: newId(), text: 'Puck excused; understudy walked the track.' },
        ] },
      ],
      scheduleNote: 'Next call: Tech / dry run — 12:00 on Main Stage.',
      createdAt: new Date().toISOString() },
  ]

  return {
    id: newId(),
    title: "A Midsummer Night's Dream",
    company: 'Globe Repertory',
    venue: 'Black Box Theatre',
    director: 'A. Marlowe',
    firstRehearsal: iso(-21),
    openingNight: iso(10),
    closingNight: iso(24),
    notes: 'Sample production — tap Settings → “Remove sample” to clear it anytime.',
    people,
    events,
    attendance,
    reports,
    scenes,
    props,
    lineNotes,
    createdAt: new Date().toISOString(),
  }
}
