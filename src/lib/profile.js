export const emptyProfile = () => ({
  headline: '',
  about: '',
  location: '',
  discipline: 'Engineering',
  level: 'Mid',
  skills: [],
  experience: [],
  education: [],
  links: { website: '', github: '', linkedin: '' },
  openTo: []
});

/** Each completeness check as [label, done, weight], the one list both the meter and the rail read. */
export const profileChecks = (profile) => [
  ['Headline', !!profile.headline, 2],
  ['About', !!profile.about && profile.about.length > 40, 2],
  ['Location', !!profile.location, 1],
  ['Three or more skills', profile.skills.length >= 3, 2],
  ['One role of experience', profile.experience.length >= 1, 3],
  ['Education', profile.education.length >= 1, 1],
  ['A link', Object.values(profile.links).some(Boolean), 1],
  ['What you are open to', profile.openTo.length > 0, 1]
];

/**
 * How much of the profile is filled in, as a percentage. Weighted so the
 * fields employers actually read count for more.
 */
export const profileCompleteness = (profile) => {
  const checks = profileChecks(profile);
  const earned = checks.reduce((sum, [, ok, weight]) => sum + (ok ? weight : 0), 0);
  const total = checks.reduce((sum, [, , weight]) => sum + weight, 0);
  return Math.round((earned / total) * 100);
};
