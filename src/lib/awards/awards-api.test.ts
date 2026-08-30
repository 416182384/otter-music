import { describe, expect, it } from "vitest";
import {
  awardKind,
  cleanAwardTitle,
  gmaKind,
  grammyKind,
  normalizeAwardResponse,
  splitAwardArtists,
  toAwardTracks,
} from "./awards-api";

describe("normalizeAwardResponse", () => {
  it("grammy 响应（无 source/year）用入参兜底年份，保留 nominees 与 null title，并推导 kind", () => {
    const data = normalizeAwardResponse(
      {
        url: "https://www.grammy.com/awards/",
        categories: [
          {
            name: "Record Of The Year",
            winner: "Kendrick Lamar , SZA",
            title: "luther",
            nominees: ["luther — Kendrick Lamar , SZA", "DtMF — Bad Bunny"],
          },
          {
            name: "Producer Of The Year, Non-Classical",
            winner: "Jack Antonoff",
            title: null,
            nominees: [],
          },
        ],
      },
      "grammy",
      2026
    );

    expect(data.award).toBe("grammy");
    expect(data.year).toBe(2026);
    expect(data.edition).toBeUndefined();
    expect(data.categories).toHaveLength(2);
    expect(data.categories[0].kind).toBe("song");
    expect(data.categories[0].nominees).toHaveLength(2);
    expect(data.categories[1].title).toBeNull();
    expect(data.categories[1].kind).toBeUndefined();
  });

  it("gma 响应（有 source/year/edition）读取 year 与 edition", () => {
    const data = normalizeAwardResponse(
      {
        source: "gma",
        year: 2026,
        edition: 37,
        categories: [
          { name: "年度专辑奖", winner: "蔡依林", title: "Pleasure" },
        ],
      },
      "gma",
      2020
    );

    expect(data.year).toBe(2026);
    expect(data.edition).toBe(37);
    expect(data.categories[0]).toMatchObject({
      name: "年度专辑奖",
      winner: "蔡依林",
      title: "Pleasure",
      kind: "album",
    });
  });

  it("字段缺失或非法时返回空 categories 而非抛错", () => {
    const data = normalizeAwardResponse({} as never, "gma", 2026);
    expect(data.categories).toEqual([]);
    expect(data.year).toBe(2026);
  });
});

describe("grammyKind", () => {
  it("Song / Record of the Year / 表演类 → song", () => {
    expect(grammyKind("Song Of The Year")).toBe("song");
    expect(grammyKind("Record Of The Year")).toBe("song");
    expect(grammyKind("Best Pop Solo Performance")).toBe("song");
    expect(grammyKind("Best Pop Duo/Group Performance")).toBe("song");
    expect(grammyKind("Best Dance/Electronic Recording")).toBe("song");
    expect(grammyKind("Best Country Solo Performance")).toBe("song");
  });

  it("Album / Soundtrack → album", () => {
    expect(grammyKind("Album Of The Year")).toBe("album");
    expect(grammyKind("Best Pop Vocal Album")).toBe("album");
    expect(grammyKind("Best Compilation Soundtrack For Visual Media")).toBe(
      "album"
    );
  });

  it("New Artist 变体 → artist", () => {
    expect(grammyKind("Best New Artist")).toBe("artist");
    expect(grammyKind("Best New Country & Western Artist")).toBe("artist");
  });

  it("技术 / 其他类 → undefined", () => {
    expect(grammyKind("Producer Of The Year, Non-Classical")).toBeUndefined();
    expect(grammyKind("Best Engineered Album, Non-Classical")).toBeUndefined();
    expect(grammyKind("Best Recording Package")).toBeUndefined();
    expect(grammyKind("Best Album Notes")).toBeUndefined();
    expect(grammyKind("Best Immersive Audio Album")).toBeUndefined();
    expect(grammyKind("Best Remixed Recording")).toBeUndefined();
    expect(
      grammyKind("Best Audio Book, Narration & Storytelling Recording")
    ).toBeUndefined();
    expect(grammyKind("Best Music Video")).toBeUndefined();
    expect(grammyKind("Best Opera Recording")).toBeUndefined();
  });
});

describe("gmaKind", () => {
  it("专辑 / 唱片类 → album", () => {
    expect(gmaKind("年度专辑奖")).toBe("album");
    expect(gmaKind("最佳台语专辑奖")).toBe("album");
  });

  it("表演者类先于歌曲判断（最佳国语歌曲男演唱人奖 → artist）", () => {
    expect(gmaKind("最佳华语男歌手奖")).toBe("artist");
    expect(gmaKind("最佳国语歌曲男演唱人奖")).toBe("artist");
    expect(gmaKind("最佳乐团奖")).toBe("artist");
    expect(gmaKind("最佳演唱组合奖")).toBe("artist");
  });

  it("歌曲类 → song", () => {
    expect(gmaKind("年度歌曲奖")).toBe("song");
    expect(gmaKind("最佳台语歌曲奖")).toBe("song");
  });

  it("技术 / 特别奖 → undefined", () => {
    expect(gmaKind("最佳作词人奖")).toBeUndefined();
    expect(gmaKind("最佳作曲人奖")).toBeUndefined();
    expect(gmaKind("最佳编曲人奖")).toBeUndefined();
    expect(gmaKind("最佳专辑制作人奖")).toBeUndefined();
    expect(gmaKind("最佳MV奖")).toBeUndefined();
    expect(gmaKind("特别贡献奖")).toBeUndefined();
    expect(gmaKind("评审团奖")).toBeUndefined();
  });
});

describe("awardKind", () => {
  it("按奖项 id 分发到对应推导", () => {
    expect(awardKind("grammy", "Best New Artist")).toBe("artist");
    expect(awardKind("gma", "年度专辑奖")).toBe("album");
  });
});

describe("splitAwardArtists", () => {
  it("拆分 Grammy 的逗号分隔（含空格）", () => {
    expect(splitAwardArtists("Kendrick Lamar , SZA")).toEqual([
      "Kendrick Lamar",
      "SZA",
    ]);
  });

  it("拆分 GMA 的顿号分隔", () => {
    expect(splitAwardArtists("裘德、崔展鸿")).toEqual(["裘德", "崔展鸿"]);
  });

  it("单个艺人原样返回，空段过滤", () => {
    expect(splitAwardArtists("蔡依林")).toEqual(["蔡依林"]);
    expect(splitAwardArtists("A，,、B")).toEqual(["A", "B"]);
  });
});

describe("cleanAwardTitle", () => {
  it("去掉来源注释方括号", () => {
    expect(cleanAwardTitle('Bad As I Used To Be [From "F1® The Movie"]')).toBe(
      "Bad As I Used To Be"
    );
  });

  it("无注释的标题原样返回", () => {
    expect(cleanAwardTitle("luther")).toBe("luther");
  });
});

describe("toAwardTracks", () => {
  const data = normalizeAwardResponse(
    {
      year: 2026,
      categories: [
        { name: "年度歌曲奖", winner: "A、B", title: "歌一" },
        { name: "年度专辑奖", winner: "C", title: "专辑一" },
        { name: "Producer Of The Year", winner: "P", title: null },
      ],
    },
    "gma",
    2026
  );

  it("只保留 song 类条目，album 放分类名，占位 source:all", () => {
    const tracks = toAwardTracks(data);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: "award:gma:2026:0",
      name: "歌一",
      artist: ["A", "B"],
      album: "年度歌曲奖",
      source: "all",
    });
  });
});
