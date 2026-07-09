# -*- coding: utf-8 -*-
"""Minimalny walidator JSON Schema (bez zaleznosci zewnetrznych).

Obsluguje podzbior JSON Schema (draft 2020-12) wystarczajacy dla kontraktow platformy:
  type, enum, const, required, properties, additionalProperties, patternProperties,
  items, minItems, maxItems, minimum, maximum, exclusiveMinimum, pattern,
  allOf, anyOf, oneOf, $ref (#/$defs/... oraz plik-sasiedni.schema.json).

Nie jest to pelna implementacja - celowo prosta, deterministyczna, stdlib-only.
Schematy platformy sa pisane tak, aby miescic sie w tym podzbiorze.
"""
import json
import os
import re

_TYPE_CHECKS = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "boolean": lambda v: isinstance(v, bool),
    "null": lambda v: v is None,
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
}


class SchemaValidator:
    def __init__(self, schema_dir):
        self.schema_dir = schema_dir
        self._cache = {}

    def load(self, filename):
        if filename not in self._cache:
            with open(os.path.join(self.schema_dir, filename), encoding="utf-8") as f:
                self._cache[filename] = json.load(f)
        return self._cache[filename]

    def validate_file(self, schema_filename, instance):
        schema = self.load(schema_filename)
        errors = []
        self._validate(instance, schema, schema, "$", errors)
        return errors

    def validate(self, instance, schema, root=None):
        errors = []
        self._validate(instance, schema, root or schema, "$", errors)
        return errors

    # -- resolucja $ref -------------------------------------------------
    def _resolve(self, ref, root):
        if ref.startswith("#/"):
            node = root
            for part in ref[2:].split("/"):
                part = part.replace("~1", "/").replace("~0", "~")
                node = node[part]
            return node, root
        # plik sasiedni (opcjonalnie z fragmentem)
        filename, _, frag = ref.partition("#")
        sub = self.load(filename)
        newroot = sub
        node = sub
        if frag:
            for part in frag.strip("/").split("/"):
                node = node[part]
        return node, newroot

    # -- rdzen ----------------------------------------------------------
    def _validate(self, inst, schema, root, path, errors):
        if schema is True or schema == {}:
            return
        if schema is False:
            errors.append(f"{path}: schemat zabrania jakiejkolwiek wartosci")
            return

        if "$ref" in schema:
            target, newroot = self._resolve(schema["$ref"], root)
            self._validate(inst, target, newroot, path, errors)
            # dodatkowe slowa kluczowe obok $ref sa ignorowane (jak w starszym draft)
            return

        # type
        if "type" in schema:
            types = schema["type"]
            if isinstance(types, str):
                types = [types]
            if not any(_TYPE_CHECKS[t](inst) for t in types):
                errors.append(f"{path}: oczekiwano typu {types}, jest {type(inst).__name__}")
                return

        # const / enum
        if "const" in schema and inst != schema["const"]:
            errors.append(f"{path}: oczekiwano const={schema['const']!r}")
        if "enum" in schema and inst not in schema["enum"]:
            errors.append(f"{path}: wartosc {inst!r} spoza enum {schema['enum']}")

        # kombinatory
        for key in ("allOf", "anyOf", "oneOf"):
            if key in schema:
                self._combine(key, inst, schema[key], root, path, errors)

        if isinstance(inst, dict):
            self._validate_object(inst, schema, root, path, errors)
        elif isinstance(inst, list):
            self._validate_array(inst, schema, root, path, errors)
        elif isinstance(inst, str):
            self._validate_string(inst, schema, path, errors)
        elif isinstance(inst, (int, float)) and not isinstance(inst, bool):
            self._validate_number(inst, schema, path, errors)

    def _combine(self, key, inst, subschemas, root, path, errors):
        results = []
        for i, sub in enumerate(subschemas):
            local = []
            self._validate(inst, sub, root, f"{path}/{key}[{i}]", local)
            results.append(local)
        passed = sum(1 for r in results if not r)
        if key == "allOf" and passed != len(subschemas):
            for r in results:
                errors.extend(r)
        elif key == "anyOf" and passed == 0:
            errors.append(f"{path}: nie spelnia zadnego z anyOf")
        elif key == "oneOf" and passed != 1:
            errors.append(f"{path}: oczekiwano dokladnie 1 z oneOf, spelniono {passed}")

    def _validate_object(self, inst, schema, root, path, errors):
        for req in schema.get("required", []):
            if req not in inst:
                errors.append(f"{path}: brak wymaganego pola '{req}'")
        props = schema.get("properties", {})
        for k, v in inst.items():
            if k in props:
                self._validate(v, props[k], root, f"{path}.{k}", errors)
                continue
            matched = False
            for pat, subschema in schema.get("patternProperties", {}).items():
                if re.search(pat, k):
                    matched = True
                    self._validate(v, subschema, root, f"{path}.{k}", errors)
            if matched:
                continue
            ap = schema.get("additionalProperties", True)
            if ap is False:
                errors.append(f"{path}: niedozwolone dodatkowe pole '{k}'")
            elif isinstance(ap, dict):
                self._validate(v, ap, root, f"{path}.{k}", errors)

    def _validate_array(self, inst, schema, root, path, errors):
        if "minItems" in schema and len(inst) < schema["minItems"]:
            errors.append(f"{path}: za malo elementow ({len(inst)} < {schema['minItems']})")
        if "maxItems" in schema and len(inst) > schema["maxItems"]:
            errors.append(f"{path}: za duzo elementow ({len(inst)} > {schema['maxItems']})")
        items = schema.get("items")
        if isinstance(items, dict) or items is True or items is False:
            for i, el in enumerate(inst):
                self._validate(el, items, root, f"{path}[{i}]", errors)

    def _validate_string(self, inst, schema, path, errors):
        if "pattern" in schema and not re.search(schema["pattern"], inst):
            errors.append(f"{path}: '{inst}' nie pasuje do wzorca {schema['pattern']}")
        if "minLength" in schema and len(inst) < schema["minLength"]:
            errors.append(f"{path}: za krotki tekst")

    def _validate_number(self, inst, schema, path, errors):
        if "minimum" in schema and inst < schema["minimum"]:
            errors.append(f"{path}: {inst} < minimum {schema['minimum']}")
        if "maximum" in schema and inst > schema["maximum"]:
            errors.append(f"{path}: {inst} > maximum {schema['maximum']}")
        if "exclusiveMinimum" in schema and inst <= schema["exclusiveMinimum"]:
            errors.append(f"{path}: {inst} <= exclusiveMinimum {schema['exclusiveMinimum']}")
