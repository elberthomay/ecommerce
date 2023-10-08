import City from "../models/City";

export interface cityIdType {
  cityId: City["id"];
}

export interface cityCreateType {
  name: City["name"];
  longitude: City["longitude"];
  latitude: City["latitude"];
}

export interface cityUpdateType {
  name?: City["name"];
  longitude?: City["longitude"];
  latitude?: City["latitude"];
}
