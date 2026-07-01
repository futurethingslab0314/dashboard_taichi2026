# Exhibition CMS / Notion Database 規劃

## 設計理念

將系統拆成三個層級：

``` text
Content Objects
        │
        ▼
Section Templates (Collections)
        │
        ▼
Pages / Zone Layout
```

-   **Content Objects**：所有真正的內容資料（人物、店家、作品、講題...）
-   **Section Templates**：定義某個展區需要哪些內容。
-   **Pages / Zone Layout**：決定頁面或展區如何排列各個 Section。

------------------------------------------------------------------------

# Database 1：Content Objects

所有具有獨立生命週期的內容都放在這裡。

## 建議欄位

  ------------------------------------------------------------------------
  欄位                    型別                     說明
  ----------------------- ------------------------ -----------------------
  Name                    Title                    唯一名稱

  Type                    Select                   Speaker / Organization
                                                   / Food / Performance /
                                                   Chair / Course / Theme
                                                   / Schedule / Talk

  Parent                  Relation(Self)           建立父子關係

  Title (ZH)              Text                     中文標題

  Title (EN)              Text                     英文標題

  Description (ZH)        Text                     中文介紹

  Description (EN)        Text                     英文介紹

  Image                   Files                    圖片

  Logo                    Files                    Logo（若適用）

  Related People          Relation(People)         關聯人物

  Related Organization    Relation(Organization)   關聯單位

  Status                  Select                   Draft / Review /
                                                   Published
  ------------------------------------------------------------------------

## 範例

``` text
老濟安 (Organization)
    ├── 青草茶 (Food)
    └── 未來特調 (Food)

師園
    ├── 鹽酥雞
    └── AI雞排

紙箱椅課程
    ├── Chair A
    └── Chair B

Live Coding Stage
    ├── Performance 1
    ├── Performance 2
    └── Performance 3
```

------------------------------------------------------------------------

# Database 2：Section Templates

一個 Section 負責組裝一個展覽區塊。

## 建議欄位

  欄位           型別
  -------------- ---------------------------
  Name           Title
  Section Type   Select
  Objects        Relation(Content Objects)
  Layout Style   Select
  Visible        Checkbox

## 範例

### Hero

-   Big Bang Title
-   Slogan
-   Introduction

------------------------------------------------------------------------

### Food Section

-   老濟安
-   師園

每個店家再透過 Parent Relation 自己帶出食物。

------------------------------------------------------------------------

### Speaker Section

-   Sarah Pink
-   Speaker B
-   Speaker C
-   Speaker D

------------------------------------------------------------------------

### Chair Section

-   課程介紹
-   Teacher
-   Chair A
-   Chair B

------------------------------------------------------------------------

### Live Coding Section

-   標題
-   區域介紹
-   時刻表
-   Performer List

------------------------------------------------------------------------

# Database 3：Pages / Zone Layout

控制網站或 Dashboard 的排列順序。

## 建議欄位

  欄位      型別
  --------- -----------------------------
  Name      Title
  Page      Select
  Order     Number
  Section   Relation(Section Templates)
  Visible   Checkbox

## 範例

``` text
Homepage

1 Hero
2 Schedule
3 Organizations
4 Food
5 Opening Performance
6 Live Coding
7 Chair
8 Speakers
9 Footer
```

------------------------------------------------------------------------

# Relation 架構

``` text
Content Objects
        │
        ▼
Section Templates
        │
        ▼
Pages / Zone Layout
```

也可以理解為：

``` text
Content
    ↓
Collection
    ↓
Page
```

------------------------------------------------------------------------

# 對應目前展覽內容

## Hero

-   主標
-   Slogan
-   概念介紹

## Schedule

-   活動時程
-   5F
-   12F

## Organizations

-   四個合作單位
-   Logo
-   介紹

## Food

-   老濟安
    -   店家介紹
    -   食物 A
    -   食物 B
-   師園
    -   店家介紹
    -   食物 A
    -   食物 B

## Opening Performance

-   表演 1
-   表演 2

## Live Coding

-   區域介紹
-   時刻表
-   Performer List

## Chair Course

-   課程介紹
-   Teacher
-   Chair A
-   Chair B

## Speakers

-   四位講者
-   講題
-   個人介紹

------------------------------------------------------------------------

# 設計原則

1.  **Content 與 Layout 分離**
    -   修改內容不影響版面。
    -   修改版面不需要改內容。
2.  **Section 負責組裝**
    -   一個 Section 對應一個展區。
    -   可跨不同網站與展覽重複使用。
3.  **Content Object 保持獨立**
    -   每個人物、店家、作品都是獨立物件。
    -   方便重用與維護。
4.  **Parent Relation 建立階層**
    -   店家 → 食物
    -   課程 → 椅子
    -   舞台 → 表演
5.  **未來可擴充**
    -   多語系
    -   QR Code
    -   Sponsor
    -   更多展覽
    -   更多網站

------------------------------------------------------------------------

## 最終架構

``` text
Content Objects
        │
        ├── Speakers
        ├── Organizations
        ├── Food
        ├── Performance
        ├── Chair
        ├── Course
        └── Theme

                │
                ▼

Section Templates
        │
        ├── Hero
        ├── Food
        ├── Speaker
        ├── Chair
        ├── Live Coding
        └── Schedule

                │
                ▼

Pages / Zone Layout

Homepage
Exhibition Dashboard
Future Website
```

此架構可作為 Big Bang! Futures、HCOMP、研討會網站或其他展覽的通用 CMS。
