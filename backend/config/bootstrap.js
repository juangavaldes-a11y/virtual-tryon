// Seeds the default virtual models (served by the frontend from /models/*.svg).
const SEEDS = [
  { name: 'Sofia', bodyType: 'curvy', imageUrl: '/models/latina.svg' },
  { name: 'Emma', bodyType: 'regular', imageUrl: '/models/european.svg' },
  { name: 'Mei', bodyType: 'slim', imageUrl: '/models/asian.svg' },
];
const RETIRED = ['/models/slim.svg', '/models/regular.svg', '/models/curvy.svg'];

module.exports.bootstrap = async function () {
  const { mannequin } = sails.models;
  await mannequin.destroy({ imageUrl: RETIRED });
  for (const seed of SEEDS) {
    if (!(await mannequin.count({ imageUrl: seed.imageUrl }))) {
      await mannequin.create(seed);
      sails.log.info(`Seeded mannequin ${seed.name}.`);
    }
  }
};
