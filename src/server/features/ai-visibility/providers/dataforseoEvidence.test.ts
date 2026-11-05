import { describe, expect, it } from "vitest";
import { parseDataforseoAnswer } from "./dataforseoEvidence";

describe("DataForSEO answer evidence", () => {
  it("keeps safe cited pages without tracking parameters and drops citation pills from prose", () => {
    const result = parseDataforseoAnswer(
      {
        datetime: "2026-09-30 18:41:09 +00:00",
        markdown:
          "- **OpenSEO** is open source. [openseo.so](https://openseo.so/blog?utm_source=chatgpt.com) See [SerpBear on GitHub](https://github.com/towfiqi/serpbear).",
        sources: [
          {
            url: "https://openseo.so/blog?utm_source=chatgpt.com",
            title: "Blog",
          },
          { url: "javascript:alert(1)" },
        ],
        search_results: [{ url: "https://example.com/retrieved" }],
      },
      "chatgpt",
    );
    expect(result).toMatchObject({
      answerText: "OpenSEO is open source.  See SerpBear on GitHub.",
      citations: [
        {
          url: "https://openseo.so/blog",
          domain: "openseo.so",
          title: "Blog",
          position: 1,
        },
      ],
      collectedAt: "2026-09-30T18:41:09.000Z",
    });
  });

  it("reads every Google AI Overview reference as a citation", () => {
    const result = parseDataforseoAnswer(
      {
        items: [
          {
            type: "ai_overview",
            markdown: "Use SerpBear.[[1]](https://ccbd.dev/blog)",
            references: [{ url: "https://ccbd.dev/blog" }],
            items: [
              {
                references: [{ url: "https://matomo.org/" }],
                links: [{ url: "https://github.com/towfiqi/serpbear" }],
              },
            ],
          },
        ],
      },
      "google_ai_overview",
    );
    expect(result?.answerText).toBe("Use SerpBear.");
    expect(result?.citations.map((citation) => citation.domain)).toEqual([
      "ccbd.dev",
      "matomo.org",
    ]);
  });

  it("reads a Google AI Mode answer and its references", () => {
    const result = parseDataforseoAnswer(
      {
        datetime: "2026-10-01 09:00:00 +00:00",
        items: [
          {
            type: "ai_overview",
            markdown: "OpenSEO tracks AI answers.[[1]](https://openseo.so/)",
            references: [{ url: "https://openseo.so/", title: "OpenSEO" }],
          },
        ],
      },
      "google_ai_mode",
    );
    expect(result).toMatchObject({
      answerText: "OpenSEO tracks AI answers.",
      citations: [{ domain: "openseo.so", title: "OpenSEO" }],
      collectedAt: "2026-10-01T09:00:00.000Z",
    });
  });

  it("keeps ChatGPT's fan-out searches in order, trimmed and de-duplicated", () => {
    const result = parseDataforseoAnswer(
      {
        markdown: "Standing desks from several brands.",
        fan_out_queries: [
          " best oak standing desk ",
          "Best Oak Standing Desk",
          "",
          "oak standing desk reviews",
        ],
      },
      "chatgpt",
    );
    expect(result?.fanOutQueries).toEqual([
      "best oak standing desk",
      "oak standing desk reviews",
    ]);
  });

  it("treats a results page without an AI Overview as no answer", () => {
    expect(
      parseDataforseoAnswer(
        { items: [{ type: "organic", url: "https://openseo.so/" }] },
        "google_ai_overview",
      ),
    ).toMatchObject({ answerMarkdown: null, citations: [] });
  });
});
