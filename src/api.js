const { 
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema
} = require('graphql');

const {
  getOne, getAll, getPage,
  Dvorana, Zupanija, Mjesto, Student, Organizacija, Predavanje, Nastavnik,
  Ispit, Rezervacija
} = require('./types');

const DataLoader = require('dataloader');

/* Pagination */
const StranicaArgType = new GraphQLInputObjectType({
  name: "Stranica", description: "Omogućuje dohvat stranice podataka.",
  fields: {
    broj: { type: GraphQLInt, defaultValue: 0, description: "Broj stranice za dohvat" },
    mjera: { type: GraphQLInt, defaultValue: 8, description: "Broj podataka po stranici" }
  }
});

const StranicaListType = (ItemType) => new GraphQLObjectType({
  name: ItemType + "Stranica", description: "Jedna stranica podataka.",
  fields: {
    ukupno: { type: GraphQLInt, description: "Ukupan broj podataka" },
    stranica: { type: new GraphQLList(ItemType), description: "Stranica podataka" }
  }
});

/* Cursor */
const PokazivacArgType = new GraphQLInputObjectType({
  name: "Pokazivac", description: "Omogućuje dohvat slijeda podataka.",
  fields: {
    pokazivac: { type: GraphQLString, defaultValue: "", description: "Pokazivač na podatak." },
    naprijed: { type: GraphQLBoolean, defaultValue: true, description: "Smjer (naprijed/natrag)." },
    mjera: { type: GraphQLInt, defaultValue: 8, description: "Broj podataka za dohvat." }
  }
});

const PokazivacItemType = (ItemType) => new GraphQLObjectType({
  name: ItemType + "Element", description: "Samostalna cjelina jednog podatka.",
  fields: {
    podatak: { type: ItemType, description: "Traženi podatak." },
    pokazivac: { type: GraphQLString, description: "Pokazivač na podatak." }
  }
});

const PokazivacListType = (ItemType) => new GraphQLObjectType({
  name: ItemType + "Pokazivac", description: "Slijed podataka.",
  fields: {
    ukupno: { type: GraphQLInt, description: "Ukupan broj podataka." },
    slijed: { type: new GraphQLList(PokazivacItemType(ItemType)), description: "Slijed podataka." },
    pokazivac: { type: GraphQLString, description: "Pokazivač na podatak." },
    kraj: { type: GraphQLBoolean, description: "Kraj podataka?" }
  }
});

/* Dvorana za predavanje.
  type Dvorana {
    "ID dvorane (oznaka)" id: ID!,
    "Kapacitet dvorane" kapacitet: Int!
  }
  */
const DvoranaType = new GraphQLObjectType({
  name: "Dvorana", description: "Dvorana za predavanje.",
  fields: {
    id: { type: GraphQLID, description: "ID dvorane (oznaka)" },
    kapacitet: { type: GraphQLInt, description: "Kapacitet dvorane" }
  }
});

const DvoranaQueryType = {
  slijed_dvorana: {
    type: PokazivacListType(DvoranaType), description: "Slijed dvorana",
    args: {
      slijed: { type: PokazivacArgType, defaultValue: { pokazivac: "", naprijed: true, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Dvorana.slijed(args, ctx)
  },
  dvorana: {
    type: StranicaListType(DvoranaType), description: "Lista dvorana",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Dvorana.stranica(args, ctx)
  },
  sve_dvorane: {
    type: GraphQLList(DvoranaType), description: "Lista svih dvorana",
    resolve: (obj, args, ctx, info) => Dvorana.sve(args, ctx)
  }
};

/* Područje lokalne samouprave.
  type Zupanija {
    "ID županije (šifra)" id: ID!,
    "Naziv županije"    naziv: String!
  }
  */
const ZupanijaType = new GraphQLObjectType({
  name: "Zupanija", description: "Područje lokalne samouprave.",
  fields: {
    id: { type: GraphQLID, description: "ID županije (šifra)" },
    naziv: { type: GraphQLString, description: "Naziv županije" }
  }
});

const ZupanijaQueryType = {
  zupanija: {
    type: StranicaListType(ZupanijaType), description: "Lista županija",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Zupanija.stranica(args, ctx)
  },
  sve_zupanije: {
    type: GraphQLList(ZupanijaType), description: "Lista županija",
    resolve: (obj, args, ctx, info) => Zupanija.sve(args, ctx)
  }
};

/* Mjesto stalnog ili povremenog boravka ljudi.
  type Mjesto {
    "ID mjesta (poštanski broj)" id: ID!,
    "Naziv mjesta"      naziv: String!,
    "Županija mjesta"   zupanija: Zupanija!
  }
  */
const MjestoType = new GraphQLObjectType({
  name: "Mjesto", description: "Mjesto stalnog ili povremenog boravka ljudi.",
  fields: () => ({
    id: { type: GraphQLID, description: "ID mjesta (poštanski broj)" },
    naziv: { type: GraphQLString, description: "Naziv mjesta" },
    zupanija: { type: ZupanijaType, description: "Županija mjesta" }
  })
});

const MjestoQueryType = {
  mjesto: {
    type: StranicaListType(MjestoType), description: "Lista mjesta",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Mjesto.stranica(args, ctx)
  },
  sva_mjesta: {
    type: GraphQLList(MjestoType), description: "Lista mjesta",
    resolve: (obj, args, ctx, info) => Mjesto.sve(args, ctx)
  }
};

/* Polaznik fakulteta ili visoke škole.
  type Student {
    "ID studenta (matični broj)" id: ID!,
    "Ime studenta"      ime: String!,
    "Prezime studenta"  prezime: String!,
    "Mjesto rođenja"    rodjenje: Mjesto!,
    "Mjesto stanovanja" stanuje: Mjesto!,
    "Datum rođenja"     rodjendan: String!,
    "JMBG studenta"     jmbg: String!
  }
  */
const StudentType = new GraphQLObjectType({
  name: "Student", description: "Polaznik fakulteta ili visoke škole.",
  fields: () => ({
    id: { type: GraphQLID, description: "ID studenta (matični broj)" },
    ime: { type: GraphQLString, description: "Ime studenta" },
    prezime: { type: GraphQLString, description: "Prezime studenta" },
    rodjenje: { type: MjestoType, description: "Mjesto rođenja" },
    stanuje: { type: MjestoType, description: "Mjesto stanovanja" },
    rodjendan: { type: GraphQLString, description: "Datum rođenja" },
    jmbg: { type: GraphQLString, description: "JMBG studenta" }
  })
});

const StudentQueryType = {
  student: {
    type: StranicaListType(StudentType), description: "Lista studenata",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Student.stranica(args, ctx)
  },
  svi_studenti: {
    type: GraphQLList(StudentType), description: "Lista studenata",
    resolve: (obj, args, ctx, info) => Student.sve(args, ctx)
  }
};

/* Organizacijska jedinica (sveučilište, fakultet ili visoka škola).
  type Organizacija {
    "ID org. jed. (šifra)" id: ID!,
    "Naziv org. jed."   naziv: String!,
    "Nadređena org. jed." org: Organizacija!
  }
  */
const OrganizacijaType = new GraphQLObjectType({
  name: "Organizacija", description: "Organizacijska jedinica: sveučilište, fakultet ili visoka škola.",
  fields: () => ({
    id: { type: GraphQLID, description: "ID org. jed. (šifra)" },
    naziv: { type: GraphQLString, description: "Naziv org. jed." },
    org: { type: OrganizacijaType, description: "Nadređena org. jed." }
  })
});

const OrganizacijaQueryType = {
  organizacija: {
    type: StranicaListType(OrganizacijaType), description: "Lista org. jed.",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Organizacija.stranica(args, ctx)
  },
  sve_organizacije: {
    type: GraphQLList(OrganizacijaType), description: "Lista org. jed.",
    resolve: (obj, args, ctx, info) => Organizacija.sve(args, ctx)
  }
};

/* Dostupna predavanja na fakultetu ili visokoj školi.
  type Predavanje {
    "ID predavanja (šifra)" id: ID!,
    "Kratki naziv"      kratica: String!,
    "Puni naziv"        naziv: String!,
    "Org. jedinica"     org: Organizacija!,
    "Upisano studenata" upisano: Int!,
    "Broj sati tjedno"  sati: Int!
  }
  */
const PredavanjeType = new GraphQLObjectType({
  name: "Predavanja", description: "Dostupna predavanja na fakultetu ili visokoj školi.",
  fields: () => ({
    id: { type: GraphQLID, description: "ID predavanja (šifra)" },
    kratica: { type: GraphQLString, description: "Kratki naziv" },
    naziv: { type: GraphQLString, description: "Puni naziv" },
    org: { type: OrganizacijaType, description: "Org. jedinica" },
    upisano: { type: GraphQLInt, description: "Upisano studenata" },
    sati: { type: GraphQLInt, description: "Broj sati tjedno" }
  })
});

const PredavanjeQueryType = {
  predavanje: {
    type: StranicaListType(PredavanjeType), description: "Lista predavanja",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Predavanje.stranica(args, ctx)
  },
  sva_predavanja: {
    type: GraphQLList(PredavanjeType), description: "Lista predavanja",
    resolve: (obj, args, ctx, info) => Predavanje.sve(args, ctx)
  }
};

/* Stručna osoba educirana za rad na fakultetu ili visokoj školi.
  type Nastavnik {
    "ID nastavnika (šifra)" id: ID!,
    "Ime nastavnika"    ime: String!,
    "Prezime nastavnika" prezime: String!,
    "Mjesto stanovanja" stanuje: Mjesto!,
    "Org. jedinica"     org: Organizacija!,
    "Koeficijent"       koef: Float!
  }
  */
const NastavnikType = new GraphQLObjectType({
  name: "Nastavnik", description: "Stručna osoba educirana za rad na fakultetu ili visokoj školi.",
  fields: () => ({
    id: { type: GraphQLID, description: "ID nastavnika (šifra)" },
    ime: { type: GraphQLString, description: "Ime nastavnika" },
    prezime: { type: GraphQLString, description: "Prezime nastavnika" },
    stanuje: { type: GraphQLString, description: "Mjesto stanovanja" },
    org: { type: OrganizacijaType, description: "Org. jedinica" },
    koef: { type: GraphQLFloat, description: "Koeficijent" }
  })
});

const NastavnikQueryType = {
  nastavnik: {
    type: StranicaListType(NastavnikType), description: "Lista nastavnika",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Nastavnik.stranica(args, ctx)
  },
  svi_nastavnici: {
    type: GraphQLList(NastavnikType), description: "Lista nastavnika",
    resolve: (obj, args, ctx, info) => Nastavnik.sve(args, ctx)
  }
};

/* Ispitni rezultati.
  type Ispit {
    "ID rezultata"      id: ID!,
    "Student"           student: Student!,
    "Predavanje"        predavanje: Predavanje!,
    "Datum ispita"      datum: String!,
    "Ocjena"            ocjena: Int!,
  }
  */
const IspitType = new GraphQLObjectType({
  name: "Ispit", description: "Ispitni rezultati.",
  fields: () => ({
    id: { type: GraphQLID, description: "ID rezultata" },
    student: { type: StudentType, description: "Student" },
    predavanje: { type: PredavanjeType, description: "Predavanje" },
    datum: { type: GraphQLString, description: "Datum ispita" },
    ocjena: { type: GraphQLInt, description: "Ocjena" }
  })
});

const IspitQueryType = {
  ispit: {
    type: StranicaListType(IspitType), description: "Lista ispitnih rezultata",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Ispit.stranica(args, ctx)
  },
  svi_ispiti: {
    type: GraphQLList(IspitType), description: "Lista ispitnih rezultata",
    resolve: (obj, args, ctx, info) => Ispit.sve(args, ctx)
  }
};

/* Rezervacije predavanja u dvorani.
  type Rezervacija {
    "ID rezervacije"    id: ID!,
    "Dvorana"           dvorana: Dvorana!,
    "Dan rezervacije"   dan: String!,
    "Sat rezervacije"   sat: Int!,
    "Predavanje"        predavanje: Predavanje!
  }
  */
const RezervacijaType = new GraphQLObjectType({
  name: "Rezervacija", description: "Rezervacija predavanja u dvorani.",
  fields: () => ({
    id: { type: GraphQLID, description: "ID rezervacije" },
    dvorana: { type: DvoranaType, description: "Dvorana" },
    dan: { type: GraphQLString, description: "Dan rezervacije" },
    sat: { type: GraphQLInt, description: "Sat rezervacije" },
    predavanje: { type: PredavanjeType, description: "Predavanje" }
  })
});

const RezervacijaQueryType = {
  rezervacija: {
    type: StranicaListType(RezervacijaType), description: "Lista rezervacija",
    args: {
      stranica: { type: StranicaArgType, defaultValue: { broj: 0, mjera: 8 } }
    },
    resolve: (object, args, ctx) => Rezervacija.stranica(args, ctx)
  },
  sve_rezervacije: {
    type: GraphQLList(RezervacijaType), description: "Lista rezervacija",
    resolve: (obj, args, ctx, info) => Rezervacija.sve(args, ctx)
  }
};

/* Dostupni upiti.
  type Query {
    "Lista dvorana" dvorana: [Dvorana],
    "Lista županija" zupanija: [Zupanija],
    "Lista mjesta" mjesto: [Mjesto],
    "Lista studenata" student: [Student],
    "Lista organizacijskih jedinica" organizacija: [Organizacija],
    "Lista predavanja" predavanje: [Predavanje],
    "Lista nastavnika" nastavnik: [Nastavnik],
    "Lista ispitnih rezultata" ispit: [Ispit],
    "Lista rezervacija dvorana" rezervacija: [Rezervacija]
  }
  */

const QueryType = new GraphQLObjectType({
  name: "Query", description: "Dostupni upiti",
  fields: {
    ...DvoranaQueryType,
    ...ZupanijaQueryType,
    ...MjestoQueryType,
    ...StudentQueryType,
    ...OrganizacijaQueryType,
    ...PredavanjeQueryType,
    ...NastavnikQueryType,
    ...IspitQueryType,
    ...RezervacijaQueryType
  }
});

const Schema = new GraphQLSchema({
  query: QueryType
});

// dataloader
const getData = (keys, db, Type) => new Promise((resolve, reject) => {
  //console.log(`SELECT * FROM ${Type.tablica()} WHERE ${Type.kljuc()} IN ${keys}`);
  resolve(
    db.all(`SELECT * FROM ${Type.tablica()} WHERE ${Type.kljuc()} IN (${keys.map(() => '?').join()})`, keys)
    .then(result => result.map(r => new Type(r)))
    .catch((e) => { console.log(e); })
  );
});

const buildLoaders = (db) => {
  return {
    dvorana: new DataLoader(keys => getData(keys, db, Dvorana)),
    zupanija: new DataLoader(keys => getData(keys, db, Zupanija)),
    mjesto: new DataLoader(keys => getData(keys, db, Mjesto)),
    student: new DataLoader(keys => getData(keys, db, Student)),
    organizacija: new DataLoader(keys => getData(keys, db, Organizacija)),
    predavanje: new DataLoader(keys => getData(keys, db, Predavanje)),
    nastavnik: new DataLoader(keys => getData(keys, db, Nastavnik)),
    ispit: new DataLoader(keys => getData(keys, db, Ispit)),
    rezervacija: new DataLoader(keys => getData(keys, db, Rezervacija))
  }
};

module.exports.Schema = Schema;
module.exports.buildLoaders = buildLoaders;
