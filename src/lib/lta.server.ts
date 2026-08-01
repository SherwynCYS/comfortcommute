const LTA_BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice";

export async function ltaFetch(path: string, apiKey: string) {
  const response = await fetch(`${LTA_BASE_URL}${path}`, {
    headers: { AccountKey: apiKey, Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LTA API error [${response.status}]: ${text}`);
  }

  return response.json();
}

export type TrainServiceAlert = { Status: string; Line: string };

export async function fetchTrainServiceAlerts(): Promise<{ value?: TrainServiceAlert[] }> {
  const apiKey = process.env.LTA_DATAMALL_API_KEY;
  if (!apiKey) throw new Error("Missing LTA_DATAMALL_API_KEY");

  const json = (await ltaFetch("/TrainServiceAlerts", apiKey)) as {
    value?: { Status?: number | string; Message?: { Content?: string; CreatedDate?: string }[] };
  };

  // LTA returns { value: { Status, AffectedSegments, Message: [...] } }.
  const value = json?.value as
    | { Status?: number | string; Message?: { Content?: string }[] }
    | undefined;

  const messages = value?.Message ?? [];
  const alerts: TrainServiceAlert[] = messages
    .map((m) => m?.Content)
    .filter((c): c is string => Boolean(c && c.trim()))
    .map((content) => ({ Status: content, Line: "Rail network" }));

  return { value: alerts };
}
