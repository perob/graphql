const sqlite = require('sqlite');
const DataLoader = require('dataloader');
const { base64 } = require('./base64');

function getOne(ctx, value, Type) {
  //console.log(`SELECT * FROM ${Type.tablica()} WHERE ${Type.kljuc()} = ${value}`);
  return ctx.db.get(`SELECT * FROM ${Type.tablica()} WHERE ${Type.kljuc()} = ?`, [value])
    .then(result => new Type(result));
}

function getAll(ctx, Type) {
  //console.log(`SELECT * FROM ${Type.tablica()}`);
  return ctx.db.all(`SELECT * FROM ${Type.tablica()}`)
    .then(result => result.map(r => new Type(r)));
}

function getPage(args, ctx, Type) {
  const start = args.stranica.broj * args.stranica.mjera;
  const end = args.stranica.mjera;
  var rowsPromise = ctx.db.all(`SELECT * FROM ${Type.tablica()} ORDER BY id LIMIT ${start},${end}`);
  var countPromise = ctx.db.get(`SELECT count(*) as total FROM ${Type.tablica()}`);
  return Promise.all([rowsPromise, countPromise])
    .then((values) => {
      return ({ stranica: values[0].map(row => new Type(row)), ukupno: values[1].total })
    });
}

function getCursor(args, ctx, Type) {
  const limit = args.slijed.mjera;
  if (limit < 1)
    return new Error("Mjera je manja od 1.");
  const table = Type.tablica();
  var rowsPromise, countPromise;
  if (args.slijed.pokazivac == "") {
    if (args.slijed.naprijed == false)
      return new Error("Pogrešan smjer (natrag).");
    rowsPromise = ctx.db.all(`SELECT * FROM ${table} ORDER BY id LIMIT ${limit+1}`);
  } else {
    const key = base64.decode(args.slijed.pokazivac);
    if (/^[0-9]*$/.test(key) == false)
      return new Error("Pogrešan pokazivač.");
    if (args.slijed.naprijed)
      rowsPromise = ctx.db.all(`SELECT * FROM ${table} WHERE id > ? ORDER BY id ASC LIMIT ${limit+1}`, [key]);
    else
      rowsPromise = ctx.db.all(`SELECT * FROM ${table} WHERE id < ? ORDER BY id DESC LIMIT ${limit+1}`, [key]);
  }
  countPromise = ctx.db.get(`SELECT count(*) as total FROM ${table}`);
  return Promise.all([rowsPromise, countPromise])
    .then(values => {
      let content = values[0];
      let total = values[1].total;
      if (typeof content === 'undefined' || content.length == 0) {
        return ({ ukupno: total, slijed: null, pokazivac: "", kraj: true });
      }
      let isend = false;
      if (content.length > limit) {
        content.pop();
      } else {
        isend = true;
      }
      return ({
        ukupno: total,
        slijed: content.map(row => {
          return ({ podatak: new Type(row), pokazivac: base64.encode(row.id) });
        }),
        pokazivac: base64.encode(content[content.length - 1].id),
        kraj: isend
      });
    });
}

class Dvorana {
  constructor(values) {
    this.id = values.oznDvorana;
    this.kapacitet = values.kapacitet;
  }
  static tablica() { return 'dvorana'; }
  static kljuc() { return 'oznDvorana'; }
  static sve(args, ctx) { return getAll(ctx, Dvorana); }
  static stranica(args, ctx) { return getPage(args, ctx, Dvorana); }
  static slijed(args, ctx) { return getCursor(args, ctx, Dvorana); }
}

class Zupanija {
  constructor(values) {
    this.id = values.sifZupanija;
    this.naziv = values.nazZupanija;
  }
  static tablica() { return 'zupanija'; }
  static kljuc() { return 'sifZupanija'; }
  static sve(args, ctx) { return getAll(ctx, Zupanija); }
  static stranica(args, ctx) { return getPage(args, ctx, Zupanija); }
}

class Mjesto {
  constructor(values) {
    this.id = values.pbr;
    this.naziv = values.nazMjesto;
    this.sifZupanija = values.sifZupanija;
  }
  static tablica() { return 'mjesto'; }
  static kljuc() { return 'pbr'; }
  static sve(args, ctx) { return getAll(ctx, Mjesto); }
  static stranica(args, ctx) { return getPage(args, ctx, Mjesto); }
  zupanija(args, ctx) {
    if (ctx.data) { return ctx.data.zupanija.load(this.sifZupanija); }
    return getOne(ctx, this.sifZupanija, Zupanija);
  }
}

class Student {
  constructor(values) {
    this.id = values.mbrStud;
    this.ime = values.imeStud;
    this.prezime = values.prezStud;
    this.pbrRod = values.pbrRod;
    this.pbrStan = values.pbrStan;
    this.rodjendan = values.datRodStud;
    this.jmbg = values.jmbgStud;
  }
  static tablica() { return 'stud'; }
  static kljuc() { return 'mbrStud'; }
  static sve(args, ctx) { return getAll(ctx, Student); }
  static stranica(args, ctx) { return getPage(args, ctx, Student); }
  rodjenje(args, ctx) {
    if (ctx.data) { return ctx.data.mjesto.load(this.pbrRod); }
    return getOne(ctx, this.pbrRod, Mjesto);
  }
  stanuje(args, ctx) {
    if (ctx.data) { return ctx.data.mjesto.load(this.pbrStan); }
    return getOne(ctx, this.pbrStan, Mjesto);
  }
}

class Organizacija {
  constructor(values) {
    this.id = values.sifOrgJed;
    this.naziv = values.nazOrgJed;
    this.sifNadOrgJed = values.sifNadOrgJed;
  }
  static tablica() { return 'orgJed'; }
  static kljuc() { return 'sifOrgJed'; }
  static sve(args, ctx) { return getAll(ctx, Organizacija); }
  static stranica(args, ctx) { return getPage(args, ctx, Organizacija); }
  org(args, ctx) { 
    if (this.sifNadOrgJed == 0) { return new Organizacija({id:0, nazOrgJed:"Krovna organizacija", sifNadOrgJed:0}); }
    if (ctx.data) { return ctx.data.organizacija.load(this.sifNadOrgJed); }
    return getOne(ctx, this.sifNadOrgJed, Organizacija);
  }
}

class Predavanje {
  constructor(values) {
    this.id = values.sifPred;
    this.kratica = values.kratPred;
    this.naziv = values.nazPred;
    this.sifOrgJed = values.sifOrgJed;
    this.upisano = values.upisanoStud;
    this.sati = values.brojSatiTjedno;
  }
  static tablica() { return 'pred'; }
  static kljuc() { return 'sifPred'; }
  static sve(args, ctx) { return getAll(ctx, Predavanje); }
  static stranica(args, ctx) { return getPage(args, ctx, Predavanje); }
  org(args, ctx) {
    if (ctx.data) { return ctx.data.organizacija.load(this.sifOrgJed); }
    return getOne(ctx, this.sifOrgJed, Organizacija);
  }
}

class Nastavnik {
  constructor(values) {
    this.id = values.sifNastavnik;
    this.ime = values.imeNastavnik;
    this.prezime = values.prezNastavnik;
    this.pbrStan = values.pbrStan;
    this.sifOrgJed = values.sifOrgJed;
    this.koef = values.koef;
  }
  static tablica() { return 'nastavnik'; }
  static kljuc() { return 'sifNastavnik'; }
  static sve(args, ctx) { return getAll(ctx, Nastavnik); }
  static stranica(args, ctx) { return getPage(args, ctx, Nastavnik); }
  stanuje(args, ctx) {
    if (ctx.data) { return ctx.data.mjesto.load(this.pbrStan); }
    return getOne(ctx, this.pbrStan, Mjesto);
  }
  org(args, ctx) {
    if (ctx.data) { return ctx.data.organizacija.load(this.sifOrgJed); }
    return getOne(ctx, this.sifOrgJed, Organizacija);
  }
}

class Ispit {
  constructor(values) {
    this.id = values.id;
    this.mbrStud = values.mbrStud;
    this.sifPred = values.sifPred;
    this.sifNastavnik = values.sifNastavnik;
    this.datIspit = values.datIspit;
    this.ocjena = values.ocjena;
  }
  static tablica() { return 'ispit'; }
  static kljuc() { return 'id'; }
  static sve(args, ctx) { return getAll(ctx, Ispit); }
  static stranica(args, ctx) { return getPage(args, ctx, Ispit); }
  student(args, ctx) {
    if (ctx.data) { return ctx.data.student.load(this.mbrStud); }
    return getOne(ctx, this.mbrStud, Student);
  }
  nastavnik(args, ctx) {
    if (ctx.data) { return ctx.data.nastavnik.load(this.sifNastavnik); }
    return getOne(ctx, this.sifNastavnik, Nastavnik);
  }
  predavanje(args, ctx) {
    if (ctx.data) { return ctx.data.predavanje.load(this.sifPred); }
    return getOne(ctx, this.sifPred, Predavanje);
  }
}

class Rezervacija {
  constructor(values) {
    this.id = values.id;
    this.oznDvorana = values.oznDvorana;
    this.dan = values.oznVrstaDan;
    this.sat = values.sat;
    this.sifPred = values.sifPred;
  }
  static tablica() { return 'rezervacija'; }
  static kljuc() { return 'id'; }
  static sve(args, ctx) { return getAll(ctx, Rezervacija); }
  static stranica(args, ctx) { return getPage(args, ctx, Rezervacija); }
  dvorana(args, ctx) {
    if (ctx.data) { return ctx.data.dvorana.load(this.oznDvorana); }
    return getOne(ctx, this.oznDvorana, Dvorana);
  }
  predavanje(args, ctx) {
    if (ctx.data) { return ctx.data.predavanje.load(this.sifPred); }
    return getOne(ctx, this.sifPred, Predavanje);
  }
}

module.exports.Dvorana = Dvorana;
module.exports.Zupanija = Zupanija;
module.exports.Mjesto = Mjesto;
module.exports.Student = Student;
module.exports.Organizacija = Organizacija;
module.exports.Predavanje = Predavanje;
module.exports.Nastavnik = Nastavnik;
module.exports.Ispit = Ispit;
module.exports.Rezervacija = Rezervacija;
