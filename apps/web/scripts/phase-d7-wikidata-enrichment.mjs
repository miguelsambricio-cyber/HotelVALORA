// Phase D-7 — Wikidata SPARQL enrichment for branded Madrid hotels.
// Targets: wikidata_qid, year_opened (P571), total_rooms (P1106), website (P856).
// Strategy: per-hotel SPARQL with mwapi:EntitySearch + hotel/building type filter + geo score.
// Rate limit: 1 req/sec (Wikidata public endpoint guidance).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../src/lib/enrichment/providers/booking-rapidapi/fixtures/phase-d7");
const OUTPUT_HITS = path.join(FIXTURES_DIR, "wikidata-hits.json");
const OUTPUT_SQL = path.join(FIXTURES_DIR, "compact-update.sql");

// 111 branded Madrid hotels (dumped from public.hotel_canonical where brand_family is not null).
const HOTELS = [
{"booking_hotel_id":"90809","canonical_id":"33479e22-fe1e-4fd6-84e4-779a2e7f2c12","name":"AC Hotel Aitana by Marriott","lat":40.45596,"lon":-3.689743},
{"booking_hotel_id":"243091","canonical_id":"7f8a67b1-adfc-42b4-a7e3-26177b1d3e3e","name":"AC Hotel Atocha by Marriott","lat":40.404004,"lon":-3.690061},
{"booking_hotel_id":"94071","canonical_id":"3c21e3e2-d894-41ca-aa41-4d38890f6cb3","name":"AC Hotel Madrid Feria by Marriott","lat":40.4748,"lon":-3.634401},
{"booking_hotel_id":"94455","canonical_id":"651f9675-301c-43f7-820a-82e3f129b9f3","name":"AC Hotel Recoletos by Marriott","lat":40.42153,"lon":-3.689387},
{"booking_hotel_id":"4597290","canonical_id":"af50ffcc-ad13-4bae-bdbc-20648467e6a3","name":"Aloft by Marriott Madrid Gran Via","lat":40.420303,"lon":-3.707114},
{"booking_hotel_id":"375331","canonical_id":"225eabb9-4695-466d-b382-f1ffd841bb2d","name":"Atocha Hotel Madrid, Tapestry Collection by Hilton","lat":40.410484,"lon":-3.695027},
{"booking_hotel_id":"2438985","canonical_id":"0304bd68-d59c-4410-8417-8860763b4a94","name":"Axel Hotel Madrid - Adults Only","lat":40.413356,"lon":-3.701051},
{"booking_hotel_id":"92384","canonical_id":"fa0b5629-4fb3-4945-94c7-d0adf075ef84","name":"Barceló Emperatriz","lat":40.436634,"lon":-3.688048},
{"booking_hotel_id":"93360","canonical_id":"461632b0-180e-4e5e-94ac-5f3455f5b372","name":"Barceló Imagine","lat":40.470392,"lon":-3.685184},
{"booking_hotel_id":"1799501","canonical_id":"291e4210-d4b8-4427-b0c5-8aecc2a4cbfa","name":"Barceló Torre de Madrid","lat":40.424335,"lon":-3.712262},
{"booking_hotel_id":"8909003","canonical_id":"2cc1d63d-ab80-4c88-9ba4-fd61021cd724","name":"Bob W Madrid Atocha","lat":40.40303,"lon":-3.69772},
{"booking_hotel_id":"7580435","canonical_id":"33e350fc-d305-481c-b30f-aa2589825b71","name":"Bob W Madrid Chueca","lat":40.423367,"lon":-3.700918},
{"booking_hotel_id":"92250","canonical_id":"2adc938d-afcb-4463-83d7-4693bb9c35f7","name":"Canopy by Hilton Madrid Castellana","lat":40.451264,"lon":-3.693706},
{"booking_hotel_id":"91651","canonical_id":"ee3c988b-3efe-4ac0-bb5d-0e8b98ef8579","name":"Casa de las Artes member of Meliá Collection","lat":40.411649,"lon":-3.69751},
{"booking_hotel_id":"266093","canonical_id":"d2af52ca-523b-4892-b5aa-2a97b0152067","name":"Catalonia Atocha","lat":40.411844,"lon":-3.697928},
{"booking_hotel_id":"91604","canonical_id":"c285b171-6cd9-4686-847f-ea0219c93314","name":"Catalonia Goya","lat":40.425139,"lon":-3.682094},
{"booking_hotel_id":"90576","canonical_id":"68dfb451-7e6d-4460-9a39-4e9b6cf0a5dd","name":"Catalonia Gran Vía Madrid","lat":40.419407,"lon":-3.699071},
{"booking_hotel_id":"92345","canonical_id":"b6f3621a-579a-415a-a1fc-7d6a846cf8ac","name":"Catalonia Las Cortes","lat":40.414693,"lon":-3.699138},
{"booking_hotel_id":"13414681","canonical_id":"fc9d8ed0-9c80-4e19-ab57-dfb662ed8d74","name":"Catalonia Plaza España Hotel & Spa","lat":40.422814,"lon":-3.709506},
{"booking_hotel_id":"266096","canonical_id":"23d20597-0a88-46c3-928c-480de2d74ea1","name":"Catalonia Plaza Mayor","lat":40.413147,"lon":-3.700783},
{"booking_hotel_id":"90575","canonical_id":"d9b782dc-e7e2-430b-afb4-aec308495da6","name":"Catalonia Puerta del Sol","lat":40.413887,"lon":-3.702741},
{"booking_hotel_id":"2376771","canonical_id":"db052e04-ba29-41c4-a00f-96a93a740a1c","name":"Círculo Gran Vía, Autograph Collection","lat":40.420124,"lon":-3.70081},
{"booking_hotel_id":"10199915","canonical_id":"8a99c6fe-18eb-4834-83a1-704c71cd7909","name":"Crowne Plaza Madrid - Centre Retiro by IHG","lat":40.413064,"lon":-3.669226},
{"booking_hotel_id":"1909037","canonical_id":"550c9ba0-48de-471f-975a-b3b030ffa4e2","name":"DoubleTree by Hilton Madrid-Prado","lat":40.415096,"lon":-3.696793},
{"booking_hotel_id":"13016408","canonical_id":"518702d0-643d-4cdc-933b-9e1039d61a8f","name":"El Autor Hotel, Madrid, Autograph Collection","lat":40.41711,"lon":-3.696416},
{"booking_hotel_id":"92587","canonical_id":"2888ba78-1e18-4d1c-89bb-fc8da6817e43","name":"Eurostars Casa de la Lírica","lat":40.418323,"lon":-3.701392},
{"booking_hotel_id":"1187995","canonical_id":"f95382b8-0729-46a9-9e8c-b15093542909","name":"Eurostars Central","lat":40.427074,"lon":-3.698533},
{"booking_hotel_id":"90302","canonical_id":"525d3e1d-d6c8-4d64-9279-9d92d6985fff","name":"Eurostars Madrid Gran Vía","lat":40.421138,"lon":-3.709861},
{"booking_hotel_id":"12196","canonical_id":"8f2edc75-4e8a-4056-a823-06c013c0e5f7","name":"Eurostars Madrid Tower","lat":40.478162,"lon":-3.687361},
{"booking_hotel_id":"94069","canonical_id":"f8e537e1-999e-42f3-aa38-cac6748edfa0","name":"Eurostars Monte Real","lat":40.475039,"lon":-3.742961},
{"booking_hotel_id":"482850","canonical_id":"79257f39-d5e0-4ab1-b6ad-331744e54639","name":"Eurostars Plaza Mayor","lat":40.413037,"lon":-3.703917},
{"booking_hotel_id":"90767","canonical_id":"20dafe47-678b-4720-8f17-0cd3386eca35","name":"Eurostars Suites Mirasierra","lat":40.48664,"lon":-3.703551},
{"booking_hotel_id":"5853235","canonical_id":"fa20d9a6-94fa-4227-95f8-74f528e955e3","name":"Four Seasons Hotel Madrid","lat":40.417391,"lon":-3.700251},
{"booking_hotel_id":"7020213","canonical_id":"cd0dea49-1dc8-4637-89bb-c019b315202d","name":"Hard Rock Hotel Madrid","lat":40.406735,"lon":-3.695651},
{"booking_hotel_id":"12793","canonical_id":"370c1972-aa94-4841-b90b-10b773b0df18","name":"Hilton Madrid Airport","lat":40.45254,"lon":-3.585835},
{"booking_hotel_id":"276985","canonical_id":"798b830c-9f0b-4ec1-b31b-df027696fdc2","name":"Hotel Crowne Plaza Madrid Airport","lat":40.447323,"lon":-3.542431},
{"booking_hotel_id":"91584","canonical_id":"89640384-6f55-4e72-84fe-3e6f06ad3973","name":"Hotel Fénix Gran Meliá","lat":40.426514,"lon":-3.689329},
{"booking_hotel_id":"743453","canonical_id":"af8e6ebf-2b47-4b7d-8c9d-b438e7acb676","name":"Hotel Indigo Madrid Gran Vía by IHG","lat":40.420694,"lon":-3.707392},
{"booking_hotel_id":"91639","canonical_id":"dea209e1-4a94-422e-87fe-e80a324e876e","name":"Hotel Madrid Plaza España Affiliated by Meliá","lat":40.42293,"lon":-3.709863},
{"booking_hotel_id":"8985080","canonical_id":"b739dd6f-1979-4aa3-8a87-f4aafe283a2b","name":"Hotel Montera Madrid Curio Collection By Hilton","lat":40.419718,"lon":-3.701839},
{"booking_hotel_id":"91303","canonical_id":"9717c946-1996-4ed6-9e9a-a24d0fa1c0bb","name":"Hotel Palacio del Retiro Autograph Collection","lat":40.41774,"lon":-3.689073},
{"booking_hotel_id":"2765660","canonical_id":"f95cfc46-fec5-4279-901c-7cd076d38ecc","name":"Hyatt Centric Gran Via Madrid","lat":40.420051,"lon":-3.703713},
{"booking_hotel_id":"91812","canonical_id":"d3868189-c30d-4515-a51f-7e7a881b17e5","name":"Hyatt Regency Hesperia Madrid","lat":40.438839,"lon":-3.691621},
{"booking_hotel_id":"7771044","canonical_id":"05ceb6e8-d76e-49e2-ae5b-f566179f8eda","name":"Hyatt Regency Madrid Residences","lat":40.436992,"lon":-3.689467},
{"booking_hotel_id":"4904720","canonical_id":"2ea36513-b4b8-4f9b-92f6-0635594e7461","name":"Ibis Styles Madrid City Las Ventas","lat":40.441433,"lon":-3.657524},
{"booking_hotel_id":"92767","canonical_id":"c6dc6789-e03d-4410-9af6-7c6b0da73d1e","name":"Ilunion Alcalá Norte","lat":40.43632,"lon":-3.621191},
{"booking_hotel_id":"17328","canonical_id":"c43c95c0-c2a2-419d-848a-e38fd9fda05c","name":"Ilunion Atrium","lat":40.447865,"lon":-3.654689},
{"booking_hotel_id":"90364","canonical_id":"b0c3d92d-067a-4f32-9d14-9f7d796b5088","name":"Ilunion Pio XII","lat":40.468882,"lon":-3.673615},
{"booking_hotel_id":"90361","canonical_id":"d6f2ab36-8c6b-4950-8ad2-ec5898ad28d9","name":"Ilunion Suites Madrid","lat":40.447756,"lon":-3.669055},
{"booking_hotel_id":"91620","canonical_id":"67b98fd6-3447-46e0-8364-ce8c8c85cc6e","name":"INNSiDE by Meliá Madrid Gran Vía","lat":40.420535,"lon":-3.703873},
{"booking_hotel_id":"11705130","canonical_id":"4520d3f5-f18f-4f6c-af4c-97e0bc6831f3","name":"INNSiDE by Meliá Madrid Valdebebas","lat":40.491567,"lon":-3.605992},
{"booking_hotel_id":"188656","canonical_id":"1a24452a-fc44-45a8-874e-7d4c41ee55cd","name":"InterContinental Madrid by IHG","lat":40.436455,"lon":-3.690144},
{"booking_hotel_id":"91764","canonical_id":"6f7bc75e-e348-4625-bc2c-69cf2df4e1c8","name":"Madrid Alameda Aeropuerto by Meliá","lat":40.469184,"lon":-3.580315},
{"booking_hotel_id":"90738","canonical_id":"eafb935d-a6eb-44d3-b2b8-11feff59a23e","name":"Madrid Marriott Auditorium Hotel & Conference Center","lat":40.449112,"lon":-3.558677},
{"booking_hotel_id":"90764","canonical_id":"737f2c2f-0ac1-4e71-9761-a45ce20b7d74","name":"Madrid Marriott Hotel Princesa Plaza","lat":40.42975,"lon":-3.714677},
{"booking_hotel_id":"12136","canonical_id":"dafc4073-ab60-43ec-91a0-ac1d7311232e","name":"Mandarin Oriental Ritz Madrid","lat":40.415747,"lon":-3.692644},
{"booking_hotel_id":"90024","canonical_id":"f779cfbc-5c5d-43f8-ab6e-d299bbc627a0","name":"Meliá Avenida América","lat":40.447549,"lon":-3.628164},
{"booking_hotel_id":"91471","canonical_id":"6a8cb14d-43b0-42f0-b183-b0e4399d3052","name":"Meliá Castilla","lat":40.461425,"lon":-3.691972},
{"booking_hotel_id":"91436","canonical_id":"bd9fd2f0-2b0e-4711-aa0f-6b8028c72b65","name":"Meliá Madrid Barajas","lat":40.46987,"lon":-3.5818},
{"booking_hotel_id":"91437","canonical_id":"9dbba777-d08f-4c63-99b6-c95156107e93","name":"Meliá Madrid Serrano","lat":40.435384,"lon":-3.685464},
{"booking_hotel_id":"90286","canonical_id":"c8cf9188-ad2b-40c5-a1ae-50727b748f3c","name":"Mercure Madrid Centro","lat":40.413939,"lon":-3.694453},
{"booking_hotel_id":"93625","canonical_id":"eb20a0cc-5759-417b-b14d-bf571e8be58b","name":"Motel One Madrid-Plaza de España","lat":40.425577,"lon":-3.713718},
{"booking_hotel_id":"90661","canonical_id":"ec71ab4c-cba0-4e13-941d-e77f9d8d0fe0","name":"NH Collection Madrid Abascal","lat":40.438374,"lon":-3.695148},
{"booking_hotel_id":"90659","canonical_id":"7e5d4cb7-9d21-4a9b-89b4-bdb7e045b32c","name":"NH Collection Madrid Eurobuilding","lat":40.458287,"lon":-3.685843},
{"booking_hotel_id":"2775742","canonical_id":"23605208-bdeb-4a6f-b92c-a3c7b1ab94a3","name":"NH Collection Madrid Gran Vía","lat":40.419877,"lon":-3.701119},
{"booking_hotel_id":"257117","canonical_id":"fb8b5471-338f-4165-8cf8-2766b30369e1","name":"NH Collection Madrid Palacio de Tepa","lat":40.414113,"lon":-3.701609},
{"booking_hotel_id":"12857","canonical_id":"fe0dba16-de54-4313-83ef-3422298c8bf4","name":"NH Collection Madrid Paseo del Prado","lat":40.414781,"lon":-3.694763},
{"booking_hotel_id":"628125","canonical_id":"bbcd84a5-63c1-4cf2-9192-38cc223a0494","name":"NH Collection Madrid Suecia","lat":40.417892,"lon":-3.696159},
{"booking_hotel_id":"90676","canonical_id":"73617f4f-3a93-47d4-bcf4-560db5ab7fd8","name":"NH Madrid Lagasca","lat":40.427524,"lon":-3.685045},
{"booking_hotel_id":"90358","canonical_id":"5424a3d2-89e6-40c3-8a19-5aa4938138c0","name":"NH Madrid Nacional","lat":40.409912,"lon":-3.69264},
{"booking_hotel_id":"276495","canonical_id":"a3c92494-43b8-4a88-bb0a-94a461e24617","name":"NH Madrid Ribera del Manzanares","lat":40.40616,"lon":-3.721825},
{"booking_hotel_id":"93548","canonical_id":"deb5f877-8b19-4122-9a77-06756a20ebf0","name":"Novotel Campo De Las Naciones","lat":40.462236,"lon":-3.615173},
{"booking_hotel_id":"90218","canonical_id":"c74d49ee-a057-41e6-b9bf-462622cff76f","name":"Novotel Madrid Center","lat":40.421485,"lon":-3.672122},
{"booking_hotel_id":"93704","canonical_id":"69922adc-e801-4bca-8c22-a74307fa92cf","name":"Novotel Madrid City Las Ventas","lat":40.441125,"lon":-3.657562},
{"booking_hotel_id":"92895","canonical_id":"982e3779-885c-4fcc-911a-d9630b0ffad5","name":"NYX Hotel Madrid by Leonardo Hotels","lat":40.450502,"lon":-3.698163},
{"booking_hotel_id":"590488","canonical_id":"ea134703-37ff-41dd-b80f-f0ede7aff7fc","name":"Only YOU Boutique Hotel Madrid","lat":40.422265,"lon":-3.695741},
{"booking_hotel_id":"1674246","canonical_id":"0cf74e8d-56ee-4969-b45c-d02f5ad8f8e8","name":"Only YOU Hotel Atocha","lat":40.407172,"lon":-3.688318},
{"booking_hotel_id":"91670","canonical_id":"778a45ea-89f4-4201-a6da-1770a10ba6f8","name":"Palacio de los Duques Gran Meliá","lat":40.419828,"lon":-3.709488},
{"booking_hotel_id":"4616969","canonical_id":"f41820ce-b6c0-42c1-8ec3-3ad80f8da632","name":"Pestana Collection Plaza Mayor","lat":40.414733,"lon":-3.707033},
{"booking_hotel_id":"7231098","canonical_id":"b0b6ca7a-5baf-4f68-89bd-107d8d8e4587","name":"Pestana CR7 Gran Vía Madrid","lat":40.419956,"lon":-3.703285},
{"booking_hotel_id":"91859","canonical_id":"9e91c056-ecda-4833-a355-c1a2f746f8b1","name":"Petit Palace Alcalá","lat":40.418105,"lon":-3.699195},
{"booking_hotel_id":"90308","canonical_id":"64a47ef7-9915-4829-b157-f184d3539060","name":"Petit Palace Arturo Soria Alcalá","lat":40.439433,"lon":-3.638871},
{"booking_hotel_id":"428878","canonical_id":"3bf09791-e62e-4aea-8b7a-3302cefa8895","name":"Petit Palace Lealtad Plaza","lat":40.416719,"lon":-3.691001},
{"booking_hotel_id":"92306","canonical_id":"2ed5d47f-5f3e-43bf-ba62-0d1dd4f3dcaf","name":"Petit Palace Plaza del Carmen","lat":40.41914,"lon":-3.702977},
{"booking_hotel_id":"14158","canonical_id":"50cf961b-734a-42ab-9801-af52f701e076","name":"Petit Palace Plaza Mayor","lat":40.415936,"lon":-3.708995},
{"booking_hotel_id":"91564","canonical_id":"92ed7d97-bfbc-4f2a-beb0-6669bcdbbdf5","name":"Petit Palace Posada del Peine","lat":40.415673,"lon":-3.706169},
{"booking_hotel_id":"91442","canonical_id":"b1c36ef4-c983-4caf-98a3-0ecf17cec30f","name":"Petit Palace President Castellana","lat":40.429221,"lon":-3.688413},
{"booking_hotel_id":"38403","canonical_id":"52da201e-c1b0-4344-958b-b35f4c6b9497","name":"Petit Palace Santa Bárbara","lat":40.42643,"lon":-3.696374},
{"booking_hotel_id":"313504","canonical_id":"474e43b1-63af-479c-8a48-60da5c770b52","name":"Petit Palace Savoy Alfonso XII","lat":40.417257,"lon":-3.689345},
{"booking_hotel_id":"189971","canonical_id":"a66329ba-740a-4aaa-89bc-3d3aa4b125cf","name":"Radisson Blu Hotel Madrid Prado","lat":40.412612,"lon":-3.694047},
{"booking_hotel_id":"93386","canonical_id":"840dc2e1-361d-4eb1-b170-195ca3f677b9","name":"Radisson RED Madrid","lat":40.409877,"lon":-3.693713},
{"booking_hotel_id":"90291","canonical_id":"8e8ddb13-d788-48e1-adfe-a563f8458a8b","name":"Rafaelhoteles Atocha","lat":40.40146,"lon":-3.687061},
{"booking_hotel_id":"4913077","canonical_id":"3545bb5f-de71-40f9-9c80-c8330609d6f9","name":"Room Mate Collection Alba Madrid","lat":40.413643,"lon":-3.700403},
{"booking_hotel_id":"189171","canonical_id":"820c73b0-362e-49b3-be85-6c6cdcadcd82","name":"Rosewood Villa Magna","lat":40.430126,"lon":-3.688488},
{"booking_hotel_id":"90032","canonical_id":"4c3bda58-594d-4083-a52c-5a0fab482ea9","name":"Sercotel Gran Hotel Conde Duque","lat":40.43083,"lon":-3.707717},
{"booking_hotel_id":"90381","canonical_id":"c7581282-2e7a-4243-a9c3-89e21ee1689a","name":"Sercotel Madrid Aeropuerto","lat":40.458246,"lon":-3.582741},
{"booking_hotel_id":"1543865","canonical_id":"86b348a0-6afb-4b5f-bd11-7461bfc5cc14","name":"SmartRental Collection Centric II","lat":40.420818,"lon":-3.706482},
{"booking_hotel_id":"4343263","canonical_id":"c7f47b1a-01b6-41dd-83d0-70b719817e02","name":"Smartrental Collection Gran Vía Centric","lat":40.420439,"lon":-3.705227},
{"booking_hotel_id":"45851","canonical_id":"74d52fd3-5f23-4aa9-bdbb-0b8e3a7195e4","name":"The Principal Madrid Small Luxury Hotels","lat":40.419183,"lon":-3.697103},
{"booking_hotel_id":"92520","canonical_id":"45695396-5e18-4001-a670-a5e599de8103","name":"The Westin Madrid Cuzco","lat":40.458961,"lon":-3.691075},
{"booking_hotel_id":"8346513","canonical_id":"585030d0-2819-4351-9b62-06d1a9b1a781","name":"Thompson Madrid by Hyatt","lat":40.418581,"lon":-3.702781},
{"booking_hotel_id":"91835","canonical_id":"33f45d9d-fb98-4fe5-b68e-5b75bec9805f","name":"TÓTEM Madrid","lat":40.426394,"lon":-3.685536},
{"booking_hotel_id":"1066415","canonical_id":"a879af8f-ad84-4446-b56e-173d0b7b15c0","name":"URSO Hotel & Spa","lat":40.426866,"lon":-3.69824},
{"booking_hotel_id":"93683","canonical_id":"a9a68cc9-406c-4893-8103-18c893bfeb97","name":"Vincci Capitol","lat":40.420368,"lon":-3.706487},
{"booking_hotel_id":"91173","canonical_id":"4099bcef-b2df-4935-a0a7-1356daa4ea02","name":"Vincci Centrum","lat":40.41756,"lon":-3.698589},
{"booking_hotel_id":"91861","canonical_id":"269303e1-8b45-4d87-8b6f-5aafb133a198","name":"Vincci Soho","lat":40.414793,"lon":-3.698428},
{"booking_hotel_id":"90479","canonical_id":"a1b1cee6-ec8f-4946-a6e0-9a7f7fc9cb6a","name":"Vincci Soma","lat":40.424997,"lon":-3.678151},
{"booking_hotel_id":"1676516","canonical_id":"b6e4cb35-7c9e-450a-ad38-4243ec2966dc","name":"Vincci The Mint","lat":40.419616,"lon":-3.698588},
{"booking_hotel_id":"94672","canonical_id":"e14ba7b1-0162-4514-8fc9-a221728eca99","name":"Vincci Vía 66","lat":40.422455,"lon":-3.708979},
{"booking_hotel_id":"631351","canonical_id":"7b1e0026-5a85-4f70-85a9-562e12b318a8","name":"voco Madrid Las Tablas by IHG","lat":40.512576,"lon":-3.676289},
{"booking_hotel_id":"93358","canonical_id":"19e31ed2-8ef5-47ca-bb08-f42efae58ece","name":"voco Madrid Retiro by IHG","lat":40.413483,"lon":-3.667669}
];

const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "HotelVALORA/1.0 (https://hotelvalora.com; ops@metcub.com) phase-d7-wikidata";
const RATE_LIMIT_MS = 1100;
const GEO_AGREE_KM = 1.0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function buildQuery(hotelName) {
  const escaped = hotelName.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  return `
SELECT ?item ?itemLabel ?inception ?capacity ?website ?coord WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch" .
    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
    bd:serviceParam mwapi:search "${escaped}" .
    bd:serviceParam mwapi:language "en" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  { ?item wdt:P31/wdt:P279* wd:Q27686 } UNION
  { ?item wdt:P31/wdt:P279* wd:Q41176 } UNION
  { ?item wdt:P31/wdt:P279* wd:Q1248784 } UNION
  { ?item wdt:P31/wdt:P279* wd:Q3490264 }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P1106 ?capacity }
  OPTIONAL { ?item wdt:P856 ?website }
  OPTIONAL { ?item wdt:P625 ?coord }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
LIMIT 10`.trim();
}

function parseCoord(wkt) {
  if (!wkt) return null;
  const m = /Point\(([-\d.]+)\s+([-\d.]+)\)/.exec(wkt);
  if (!m) return null;
  return { lon: parseFloat(m[1]), lat: parseFloat(m[2]) };
}

function extractYear(inceptionIso) {
  if (!inceptionIso) return null;
  const m = /^(-?\d{4})/.exec(inceptionIso);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  if (y < 1700 || y > 2100) return null;
  return y;
}

function pickBestMatch(rows, hotel) {
  if (!rows || rows.length === 0) return null;
  const scored = rows.map((r) => {
    const wd = {
      qid: r.item?.value?.split("/").pop() ?? null,
      label: r.itemLabel?.value ?? null,
      inception: r.inception?.value ?? null,
      capacity: r.capacity?.value ? parseInt(r.capacity.value, 10) : null,
      website: r.website?.value ?? null,
      coord: parseCoord(r.coord?.value),
    };
    let score = 0;
    if (wd.coord && hotel.lat != null && hotel.lon != null) {
      const d = haversineKm(hotel, wd.coord);
      if (d <= GEO_AGREE_KM) score += 1.0;
      else if (d <= 5) score += 0.4;
      else score -= 0.2;
      wd.distance_km = d;
    }
    if (wd.label) {
      const nameNorm = hotel.name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2);
      const labelNorm = wd.label.toLowerCase();
      const overlap = nameNorm.filter((w) => labelNorm.includes(w)).length;
      score += overlap / Math.max(nameNorm.length, 1);
    }
    if (extractYear(wd.inception)) score += 0.2;
    if (wd.capacity) score += 0.1;
    return { wd, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.score < 0.6) return null;
  return best.wd;
}

async function runSparql(query) {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SPARQL ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.results?.bindings ?? [];
}

function escapeSqlString(s) {
  return s.replace(/'/g, "''");
}

async function main() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  const hotels = HOTELS;
  console.log(`[D-7] processing ${hotels.length} branded Madrid hotels`);

  const hits = [];
  let okCount = 0;
  let yearCount = 0;
  let capCount = 0;
  let qidCount = 0;

  for (let i = 0; i < hotels.length; i++) {
    const h = hotels[i];
    try {
      const rows = await runSparql(buildQuery(h.name));
      const best = pickBestMatch(rows, h);
      const result = {
        booking_hotel_id: h.booking_hotel_id,
        canonical_id: h.canonical_id,
        name: h.name,
        wikidata: best,
        year_opened: best ? extractYear(best.inception) : null,
        candidates: rows.length,
      };
      hits.push(result);
      if (best) {
        okCount++;
        qidCount++;
        if (result.year_opened) yearCount++;
        if (best.capacity) capCount++;
      }
      const tag = best ? `OK ${best.qid}` : "--";
      const extra = best ? ` y${result.year_opened ?? "?"} c${best.capacity ?? "?"} d${best.distance_km?.toFixed(1) ?? "?"}km` : "";
      console.log(`[${i + 1}/${hotels.length}] ${h.name.slice(0, 50).padEnd(50)} ${tag}${extra}`);
      // Checkpoint every 20 to survive crashes.
      if ((i + 1) % 20 === 0) {
        fs.writeFileSync(OUTPUT_HITS, JSON.stringify(hits, null, 2));
      }
    } catch (e) {
      console.error(`[${i + 1}/${hotels.length}] ${h.name} -> ERROR: ${e.message}`);
      hits.push({ booking_hotel_id: h.booking_hotel_id, canonical_id: h.canonical_id, name: h.name, wikidata: null, error: e.message });
    }
    if (i < hotels.length - 1) await sleep(RATE_LIMIT_MS);
  }

  fs.writeFileSync(OUTPUT_HITS, JSON.stringify(hits, null, 2));
  console.log(`\n[D-7] hits written -> ${OUTPUT_HITS}`);
  console.log(`[D-7] matched=${okCount}/${hotels.length} qid=${qidCount} year_opened=${yearCount} capacity=${capCount}`);

  const updates = hits.filter((h) => h.wikidata).map((h) => {
    const q = h.wikidata.qid;
    const y = h.year_opened;
    const c = h.wikidata.capacity;
    const w = h.wikidata.website;
    return `('${h.booking_hotel_id}',${q ? `'${q}'` : "null"},${y ?? "null"},${c ?? "null"},${w ? `'${escapeSqlString(w)}'` : "null"})`;
  });
  if (updates.length === 0) {
    console.log("[D-7] no hits, no SQL emitted.");
    return;
  }
  const sql = `-- Phase D-7 Wikidata enrichment UPDATE\nupdate public.hotel_canonical h set\n  wikidata_qid = coalesce(h.wikidata_qid, v.qid),\n  year_opened = coalesce(h.year_opened, v.year_opened),\n  total_rooms = coalesce(h.total_rooms, v.capacity),\n  website_url = coalesce(h.website_url, v.website),\n  source_confidence = h.source_confidence || jsonb_strip_nulls(jsonb_build_object(\n    'wikidata_qid', case when v.qid is not null then 1.0 else null end,\n    'year_opened_wikidata', case when v.year_opened is not null then 0.65 else null end,\n    'total_rooms_wikidata', case when v.capacity is not null then 0.55 else null end,\n    'website_wikidata', case when v.website is not null then 0.50 else null end\n  )),\n  updated_at = now()\nfrom (values\n${updates.join(",\n")}\n) as v(hotel_id, qid, year_opened, capacity, website)\nwhere h.booking_hotel_id = v.hotel_id;`;
  fs.writeFileSync(OUTPUT_SQL, sql);
  console.log(`[D-7] SQL written -> ${OUTPUT_SQL} (${updates.length} rows)`);
}

main().catch((e) => {
  console.error("[D-7] fatal:", e);
  process.exit(1);
});
