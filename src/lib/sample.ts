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
      conflicts: [
        { id: newId(), date: iso(4), note: 'Film shoot' },
        { id: newId(), date: iso(1), startTime: '18:00', endTime: '20:00', note: 'Class until 8pm' },
      ] },
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

  // Scenes ---------------------------------------------------------------
  const sc1 = newId()
  const sc2 = newId()
  const sc3 = newId()
  const scenes = [
    { id: sc1, number: '1.1', title: 'The Court', page: '1–8', characterIds: [oberon, titania],
      synopsis: 'The quarrel over the changeling boy.', notes: '' },
    { id: sc2, number: '2.1', title: 'The Wood', page: '9–16', characterIds: [puck, oberon],
      synopsis: 'Oberon sends Puck for the flower.', notes: 'Fog cue here.' },
    { id: sc3, number: '2.2', title: 'The Lovers', page: '17–24', characterIds: [hermia, lysander, puck],
      synopsis: 'The potion goes to the wrong eyes.', notes: '' },
  ]

  // Events + attendance --------------------------------------------------
  const ev1 = newId()
  const ev2 = newId()
  const events = [
    { id: ev1, type: 'Rehearsal' as const, title: 'Act 1 Blocking', date: iso(-6),
      callTime: '18:30', startTime: '19:00', endTime: '22:00', location: 'Rehearsal Rm B',
      calledPersonIds: [puck, oberon, titania], sceneIds: [sc1], notes: 'Off-book for scene 1.' },
    { id: ev2, type: 'Rehearsal' as const, title: 'Lovers - Act 2', date: iso(-2),
      callTime: '18:30', startTime: '19:00', endTime: '22:00', location: 'Rehearsal Rm B',
      calledPersonIds: [hermia, lysander, puck], sceneIds: [sc3], notes: '' },
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

  // Cues (cue-to-cue) ----------------------------------------------------
  const cues = [
    { id: newId(), number: 'LX 1', dept: 'Lighting' as const, placement: "p.1 / top of show",
      action: 'House to half, then out. Preset moonlight.', standby: 'Standby LX 1.',
      status: 'set' as const, notes: '' },
    { id: newId(), number: 'SQ 1', dept: 'Sound' as const, placement: "p.9 / Puck's entrance",
      action: 'Forest ambience up.', standby: 'Standby Sound 1.', status: 'teched' as const, notes: '' },
    { id: newId(), number: 'LX 12', dept: 'Lighting' as const, placement: "p.12 / 'I know a bank'",
      action: 'UV wash for the flower reveal.', standby: 'Standby LX 12.', status: 'teched' as const,
      notes: 'Confirm timing with SD.' },
    { id: newId(), number: 'FLY 1', dept: 'Fly' as const, placement: 'p.16 / scene shift',
      action: 'Bower flies in.', standby: 'Standby Fly 1.', status: 'dry-tech' as const, notes: '' },
    { id: newId(), number: 'SPOT 1', dept: 'Spot' as const, placement: "p.20 / Titania wakes",
      action: 'Pick up Titania, warm.', standby: 'Standby Spot 1.', status: 'dry-tech' as const, notes: '' },
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
      scheduleNote: 'Next call: Tech / dry run - 12:00 on Main Stage.',
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
    isSample: true,
    notes: 'Sample production - tap Settings → “Remove sample” to clear it anytime.',
    people,
    events,
    attendance,
    reports,
    scenes,
    props,
    lineNotes,
    cues,
    assets: [],
    createdAt: new Date().toISOString(),
  }
}

/**
 * A cabaret sample: a set list with interleaved patter, a small band, and the
 * running-order fields (key, duration). Shows how StandBy reshapes for a
 * music-driven show. Line Notes and Script are hidden for this kind.
 */
export function makeCabaretSample(): Production {
  // People ---------------------------------------------------------------
  const viv = newId()
  const cole = newId()
  const lena = newId()
  const md = newId()
  const sm = newId()
  const sound = newId()

  const people = [
    { id: viv, group: 'Cast' as const, name: 'Vivian Marsh', role: 'Host / vocals', character: '',
      email: 'vivian@example.com', phone: '(212) 555-0161',
      emergencyContactName: 'R. Marsh', emergencyContactPhone: '(212) 555-0166', conflicts: [] },
    { id: cole, group: 'Cast' as const, name: 'Cole Turner', role: 'Vocals', character: '',
      email: 'cole@example.com', phone: '(212) 555-0172', conflicts: [
        { id: newId(), date: iso(2), startTime: '17:00', endTime: '19:00', note: 'Day gig until 7' },
      ] },
    { id: lena, group: 'Cast' as const, name: 'Lena Ford', role: 'Guest artist', character: '',
      email: 'lena@example.com', phone: '(212) 555-0183', conflicts: [] },
    { id: md, group: 'Creative' as const, name: 'Marcus Webb', role: 'Music Director / Piano',
      email: 'marcus@example.com', phone: '(212) 555-0155', conflicts: [] },
    { id: sm, group: 'Production' as const, name: 'Tiffany Rex', role: 'Stage Manager',
      email: 'tiffany@example.com', phone: '(212) 555-0100', conflicts: [] },
    { id: sound, group: 'Production' as const, name: 'Dev Shah', role: 'Sound / A1',
      email: 'dev@example.com', phone: '(212) 555-0107', conflicts: [] },
  ]

  // Set list (scenes) with patter interleaved ----------------------------
  const n1 = newId()
  const scenes = [
    { id: n1, number: '1', title: 'Overture', characterIds: [], duration: '2:00',
      synopsis: 'Band instrumental as the house settles.', notes: 'Hold for latecomers.' },
    { id: newId(), number: '2', title: 'Welcome & intro', characterIds: [viv], patter: true, duration: '1:30',
      synopsis: 'Vivian greets the room, sets the evening.', notes: '' },
    { id: newId(), number: '3', title: 'Fever', characterIds: [viv], key: 'Am', duration: '3:10',
      synopsis: '', notes: 'Cool blue wash.' },
    { id: newId(), number: '4', title: 'The Nearness of You', characterIds: [cole], key: 'F', duration: '3:40',
      synopsis: '', notes: '' },
    { id: newId(), number: '5', title: 'Story: how we met', characterIds: [viv, cole], patter: true, duration: '2:00',
      synopsis: 'Banter leading into the duet.', notes: '' },
    { id: newId(), number: '6', title: "It Don't Mean a Thing", characterIds: [viv, cole], key: 'C', duration: '2:50',
      synopsis: 'Up-tempo duet.', notes: 'Button - cut light on the last hit.' },
    { id: newId(), number: '7', title: 'Guest introduction', characterIds: [viv], patter: true, duration: '0:45',
      synopsis: 'Bring on Lena.', notes: '' },
    { id: newId(), number: '8', title: 'Cry Me a River', characterIds: [lena], key: 'Em', duration: '4:05',
      synopsis: '', notes: 'Single warm special.' },
    { id: newId(), number: '9', title: 'Finale: Come Fly With Me', characterIds: [viv, cole, lena], key: 'G', duration: '3:20',
      synopsis: 'Company finale.', notes: 'Full stage, bows follow.' },
  ]

  // Events + attendance --------------------------------------------------
  const ev1 = newId()
  const events = [
    { id: ev1, type: 'Rehearsal' as const, title: 'Sitzprobe with band', date: iso(-3),
      callTime: '18:00', startTime: '18:30', endTime: '21:30', location: 'Studio A',
      calledPersonIds: [viv, cole, lena, md], sceneIds: [], notes: 'Run the full set with the trio.' },
    { id: newId(), type: 'Tech' as const, title: 'Sound check & cue-to-cue', date: iso(4),
      callTime: '16:00', startTime: '16:30', endTime: '19:00', location: 'The Blue Room',
      calledPersonIds: [], notes: 'Levels, then walk the light cues.' },
    { id: newId(), type: 'Performance' as const, title: 'Opening set', date: iso(6),
      callTime: '18:30', startTime: '20:00', endTime: '21:30', location: 'The Blue Room',
      calledPersonIds: [], notes: '' },
    { id: newId(), type: 'Performance' as const, title: 'Late set', date: iso(6),
      callTime: '21:30', startTime: '22:30', endTime: '23:59', location: 'The Blue Room',
      calledPersonIds: [], notes: 'Second show, same running order.' },
  ]

  const attendance = [
    { eventId: ev1, records: {
      [viv]: { status: 'present' as const },
      [cole]: { status: 'late' as const, note: 'Day gig ran over' },
      [lena]: { status: 'present' as const },
      [md]: { status: 'present' as const },
    } },
  ]

  // Props ----------------------------------------------------------------
  const props = [
    { id: newId(), name: 'Vocal mic + stand (SM58)', category: 'Prop' as const, sceneRef: 'All',
      usedByPersonIds: [viv], status: 'Ready' as const, notes: '' },
    { id: newId(), name: 'Bar stool', category: 'Set' as const, sceneRef: '8',
      usedByPersonIds: [lena], status: 'Ready' as const, notes: 'Center for the ballad.' },
    { id: newId(), name: 'Sparkle jacket (finale)', category: 'Costume' as const, sceneRef: '9',
      usedByPersonIds: [viv], status: 'In progress' as const, notes: '' },
  ]

  // Cues (cue-to-cue) - a music set is dense with LX + sound -------------
  const cues = [
    { id: newId(), number: 'LX 1', dept: 'Lighting' as const, placement: '#1 / Overture',
      action: 'House to half; warm piano special up.', standby: 'Standby LX 1.', status: 'set' as const, notes: '' },
    { id: newId(), number: 'SQ 1', dept: 'Sound' as const, placement: '#2 / Welcome',
      action: 'Vivian mic live; music bed under.', standby: 'Standby Sound 1.', status: 'set' as const, notes: '' },
    { id: newId(), number: 'LX 3', dept: 'Lighting' as const, placement: '#3 / Fever',
      action: 'Cool blue wash, tight.', standby: 'Standby LX 3.', status: 'teched' as const, notes: '' },
    { id: newId(), number: 'LX 8', dept: 'Lighting' as const, placement: '#8 / Cry Me a River',
      action: 'Single warm special on the stool.', standby: 'Standby LX 8.', status: 'teched' as const, notes: '' },
    { id: newId(), number: 'LX 9', dept: 'Lighting' as const, placement: '#9 / Finale',
      action: 'Full stage, sparkle; hold for bows.', standby: 'Standby LX 9.', status: 'dry-tech' as const, notes: '' },
  ]

  // A filed report -------------------------------------------------------
  const reports = [
    { id: newId(), type: 'Rehearsal' as const, date: iso(-3), eventId: ev1,
      summary: 'Ran the full set with the trio. Tempos locked; two transitions to tighten.',
      workedOn: 'All nine, in order - ~3h including a break.',
      sections: [
        { id: newId(), title: 'Music', notes: [
          { id: newId(), text: 'Pull #6 tempo back a hair; land the button cleaner.' },
        ] },
        { id: newId(), title: 'Sound', notes: [
          { id: newId(), text: 'Guest mic gain a touch hot on #8.' },
        ] },
        { id: newId(), title: 'Stage Management', notes: [
          { id: newId(), text: 'Patter #5 runs long - flag for time at the show.' },
        ] },
      ],
      scheduleNote: 'Next call: Sound check & cue-to-cue - 16:00 at The Blue Room.',
      createdAt: new Date().toISOString() },
  ]

  return {
    id: newId(),
    title: 'The Blue Room - A Cabaret Evening',
    company: 'Bathtub Gin Collective',
    venue: 'The Blue Room',
    director: 'Marcus Webb',
    kind: 'cabaret',
    firstRehearsal: iso(-10),
    openingNight: iso(6),
    closingNight: iso(6),
    isSample: true,
    notes: 'Sample cabaret - tap Settings → “Remove sample” to clear it anytime.',
    people,
    events,
    attendance,
    reports,
    scenes,
    props,
    lineNotes: [],
    cues,
    assets: [],
    createdAt: new Date().toISOString(),
  }
}
