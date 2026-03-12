export type TerritoryLevel = "departamento" | "municipio";

export interface CanonicalTerritorySelection {
    level: TerritoryLevel;
    canonicalId: string;
}

export function normalizeDepartmentCode(
    value?: string | number | null,
): string | null {
    if (value === undefined || value === null) {
        return null;
    }
    const digits = String(value).replace(/\D/g, "");
    if (!digits) {
        return null;
    }
    return digits.padStart(2, "0").slice(-2);
}

export function normalizeMunicipioCode(
    value?: string | number | null,
): string | null {
    if (value === undefined || value === null) {
        return null;
    }
    const digits = String(value).replace(/\D/g, "");
    if (!digits) {
        return null;
    }
    return digits.padStart(5, "0").slice(-5);
}

export function departmentCodeFromFeature(feature: any): string | null {
    const props = feature?.properties ?? {};
    return normalizeDepartmentCode(
        props.canonical_id ?? props.departamento_codigo ?? props.DPTO ?? props.DPTO_CCDGO,
    );
}

export function municipalityCodeFromFeature(feature: any): string | null {
    const props = feature?.properties ?? {};

    const fullCode =
        props.canonical_id ??
        props.municipio_codigo ??
        props.MPIO_CDPMP ??
        props.CODIGO_DANE ??
        props.COD_DANE ??
        props.MPIO;
    const normalizedFullCode = normalizeMunicipioCode(fullCode);
    if (normalizedFullCode) {
        return normalizedFullCode;
    }

    const deptCode = normalizeDepartmentCode(
        props.departamento_codigo ?? props.DPTO_CCDGO ?? props.DPTO,
    );
    const munDigits = String(props.MPIO_CCDGO ?? "").replace(/\D/g, "");
    if (deptCode && munDigits) {
        return `${deptCode}${munDigits.padStart(3, "0").slice(-3)}`;
    }

    return null;
}

export function departmentNameFromFeature(feature: any): string | null {
    const props = feature?.properties ?? {};
    const value = props.departamento_nombre ?? props.NOMBRE_DPT ?? props.DPTO_CNMBR;
    const text = String(value ?? "").trim();
    return text || null;
}

export function municipalityNameFromFeature(feature: any): string | null {
    const props = feature?.properties ?? {};
    const value =
        props.municipio_nombre ?? props.MPIO_CNMBR ?? props.NOMBRE_MPI ?? props.nombre;
    const text = String(value ?? "").trim();
    return text || null;
}
