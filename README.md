# Audit Management System - Proje Blueprint

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Sistem Mimarisi](#sistem-mimarisi)
3. [Sayfa Detayları](#sayfa-detayları)
   - [Dashboard (Ana Sayfa)](#1-dashboard-ana-sayfa)
   - [My Actions (Takım Aksiyonları)](#2-my-actions-takım-aksiyonları)
   - [Department Actions (Departman Aksiyonları)](#3-department-actions-departman-aksiyonları)
   - [C-Level Actions (Üst Yönetim Aksiyonları)](#4-c-level-actions-üst-yönetim-aksiyonları)
   - [All Findings Actions (Tüm Bulgular ve Aksiyonlar)](#5-all-findings-actions-tüm-bulgular-ve-aksiyonlar)
   - [Annual Audit Plan (Yıllık Denetim Planı)](#6-annual-audit-plan-yıllık-denetim-planı)
   - [Audit Maturity (Denetim Olgunluk)](#7-audit-maturity-denetim-olgunluk)
   - [Diğer Sayfalar](#diğer-sayfalar)
4. [Ortak Özellikler](#ortak-özellikler)
5. [Kullanıcı Rolleri ve Yetkiler](#kullanıcı-rolleri-ve-yetkiler)
6. [Interaktif Özellikler](#interaktif-özellikler)
7. [Teknik Detaylar](#teknik-detaylar)

---

## Genel Bakış

Bu proje, kurumsal denetim yönetimi için kapsamlı bir web uygulamasıdır. Sistem, denetim bulgularını, aksiyon planlarını, risk yönetimini ve denetim olgunluk değerlendirmelerini merkezi bir platformda yönetmek için tasarlanmıştır.

### Sistem Amacı
- Denetim bulgularının takibi ve yönetimi
- Aksiyon planlarının oluşturulması ve izlenmesi
- Risk seviyelerine göre önceliklendirme
- Yıllık denetim planlarının yönetimi
- Denetim olgunluk değerlendirmeleri
- Rol bazlı erişim kontrolü ile güvenli veri yönetimi

### Teknik Stack
- **Framework**: React 18 + TypeScript
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Chart.js
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Package Manager**: npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Sistem Mimarisi

### Proje Yapısı
```
src/
├── components/          # UI bileşenleri
│   ├── ui/            # Temel UI bileşenleri (Button, Card, Input, vb.)
│   ├── charts/        # Chart bileşenleri (PieChart, BarChart, RadarChart, vb.)
│   ├── layout/        # Layout bileşenleri (Header, Sidebar, MainLayout)
│   └── dashboard/     # Dashboard özel bileşenleri
├── pages/              # Sayfa bileşenleri
├── services/           # API servisleri ve mock data
├── store/              # Zustand state management
├── hooks/              # Custom React hooks
├── types/              # TypeScript type tanımları
├── utils/              # Yardımcı fonksiyonlar
└── config/             # Konfigürasyon dosyaları
```

### Veri Akışı
1. **API Layer**: `services/` klasöründe API çağrıları ve mock data
2. **State Management**: Zustand store'ları global state için
3. **Server State**: React Query ile server state yönetimi
4. **Component State**: useState ile lokal state yönetimi

### Path Aliases
```typescript
@/components/* → src/components/*
@/pages/* → src/pages/*
@/services/* → src/services/*
@/hooks/* → src/hooks/*
@/types/* → src/types/*
@/utils/* → src/utils/*
@/assets/* → src/assets/*
@/styles/* → src/styles/*
```

---

## Sayfa Detayları

### 1. Dashboard (Ana Sayfa)

**Route**: `/`  
**Erişim**: `admin`, `team`, `team_manager`, `ceo`

#### 📊 İçerik

##### A. Key Metrics (Önemli Metrikler)
- **4 Ana Metrik Kartı** (Mobilde carousel):
  1. **Total Findings** - Toplam bulgu sayısı
  2. **Open Actions** - Açık aksiyon sayısı
  3. **Overdue Actions** - Gecikmiş aksiyon sayısı
  4. **Completion Rate** - Tamamlanma oranı yüzdesi

- **Interaktif Özellikler**:
  - Mobilde swipe ile kartlar arasında geçiş
  - Her kart tıklanabilir ve ilgili detay sayfasına yönlendirir

##### B. Scorecard Filter (Yıl Filtresi)
- **Konum**: Sayfa üstü, sağ üst köşe
- **Seçenekler**:
  - `2024+` - 2024 ve sonrası veriler
  - `all` - Tüm yıllar
- **Etki**: Tüm chart ve tabloları filtreler

##### C. View As Dropdown (Admin İçin)
- **Konum**: Scorecard filter yanında
- **Özellik**: Admin kullanıcılar başka kullanıcıların görünümüne geçebilir
- **Filtreleme**: `team`, `team_manager` rolleri

##### D. Charts (Grafikler)

###### 1. **Finding Actions Status (Pie Chart)**
- **Veri**: Aksiyon durumlarına göre dağılım
- **Durumlar**: Open, Completed, Risk Accepted, Overdue
- **Renkler**:
  - Open: Mavi (`rgba(59, 130, 246, 0.8)`)
  - Completed: Yeşil (`rgba(34, 197, 94, 0.8)`)
  - Risk Accepted: Mor (`rgba(147, 51, 234, 0.8)`)
  - Overdue: Kırmızı (`rgba(239, 68, 68, 0.8)`)
- **Interaktif**:
  - Pie slice'lara tıklanınca `ActionDetailsModal` açılır
  - Modal'da o duruma ait tüm aksiyonlar listelenir
  - Modal'da scroll edilebilir liste
  - ESC tuşu ile modal kapanır

###### 2. **Finding Actions by Lead and Status (Bar Chart)**
- **Veri**: Audit lead'lere göre aksiyon durumları
- **Eksenler**:
  - X: Audit Lead isimleri
  - Y: Aksiyon sayıları
- **Gruplar**: Her lead için durum bazlı gruplar (Open, Completed, vb.)

###### 3. **Audit Findings by Year and Status (Bar Chart)**
- **Veri**: Yıllara göre bulgu durumları
- **Eksenler**:
  - X: Yıllar (2021-2025)
  - Y: Bulgu sayıları
- **Gruplar**: Her yıl için durum bazlı gruplar
- **Özellikler**:
  - Bar genişliği optimize edilmiş (dar)
  - Legend alt kısımda, ortalanmış, bold değil
  - Legend barlar ile çakışmıyor

###### 4. **Finding Actions Age Distribution (Bar Chart)**
- **Veri**: Aksiyonların yaş dağılımı
- **Gruplar**: 0-30 gün, 31-60 gün, 61-90 gün, 90+ gün
- **Renkler**: Yaş aralıklarına göre farklı renkler

###### 5. **Audit Maturity (Radar Chart)**
- **Veri**: Denetim olgunluk skorları
- **Boyutlar**: 11 farklı boyut, 5 grup altında
- **Yıllar**: 2024 ve 2025 karşılaştırması
- **Skor Aralığı**: 0-5
- **Özellikler**:
  - Point labels gizli (sayılar görünmez)
  - Hover'da tooltip ile değerler gösterilir
  - Format: "Boyut Adı: Değer / 5"
  - 2024 ve 2025 değerleri farklı renklerle gösterilir

###### 6. **Action Breakdown by Audit & Risk Level (Table)**
- **Veri**: Audit ve risk seviyesine göre aksiyon/finding dağılımı
- **Sütunlar**:
  - Audit Year
  - Audit Name
  - Critical (Actions/Findings)
  - High (Actions/Findings)
  - Medium (Actions/Findings)
  - Low (Actions/Findings)
  - Total (Actions/Findings)
- **Tab Modları**: 
  - `Actions` tab - Aksiyon sayıları
  - `Findings` tab - Bulgu sayıları
- **Interaktif**:
  - Sayılara tıklanınca `ActionsListModal` açılır
  - Modal'da ilgili audit, risk level ve mode'a göre filtrelenmiş liste
  - Modal'da scroll edilebilir
  - ESC tuşu ile kapanır

###### 7. **Finding Distribution by Risk Type and Risk Level (Table)**
- **Veri**: Risk tipi ve seviyesine göre bulgu dağılımı
- **Sütunlar**:
  - Risk Type
  - Critical, High, Medium, Low, Total

##### E. Control Analysis Section (Kontrol Analizi Bölümü)
- **Toggle Button**: "Show Control Analysis Charts" / "Hide Control Analysis Charts"
- **Özellikler**:
  - Toggle açıldığında otomatik scroll (200px offset ile)
  - Sticky toggle (scroll'da sabit kalır)
- **Chartlar** (Toggle açıldığında görünür):
  1. Fraud Impact Scorecards
  2. Loss Prevention Impact Scorecards
  3. Fraud Internal Control Chart
  4. Loss Prevention Summary Chart

##### F. All Charts Section (Tüm Chartlar Bölümü)
- **Toggle Button**: "See All Charts" / "Hide Charts"
- **Özellikler**:
  - Toggle açıldığında otomatik scroll (200px offset ile)
  - Sticky toggle
- **Chartlar** (Toggle açıldığında görünür):
  - Ek detay chartları

##### G. Audit Plan Section (Denetim Planı Bölümü)
- **Toggle Button**: "Show Audit Plan" / "Hide Audit Plan"
- **Year Filter**: Dropdown ile yıl seçimi
- **Özellikler**:
  - Toggle açıldığında otomatik scroll
  - Sticky toggle (mobilde)
  - Yıl filtresi ile plan verileri filtrelenir

##### H. Actions Modals
- **Overdue Actions Modal**: Gecikmiş aksiyonlar listesi
- **Upcoming Actions Modal**: Yaklaşan aksiyonlar listesi
- **Özellikler**:
  - Modal açıldığında otomatik scroll
  - ESC tuşu ile kapanır
  - Liste scroll edilebilir

##### I. Investigations Card
- **Konum**: Sayfa altında
- **İçerik**: Investigation sayıları ve durumları

#### 📱 Mobil Özellikler
- Responsive tasarım
- Touch swipe ile carousel navigasyonu
- Mobilde chart'lar optimize edilmiş boyutlarda
- Sticky toggle butonları

---

### 2. My Actions (Takım Aksiyonları)

**Route**: `/my-actions`  
**Erişim**: `admin`, `team`, `team_manager`

#### 📊 İçerik

##### A. Header
- **Başlık**: "My Team Actions"
- **Açıklama**: Role göre değişir
  - `team_manager`: "Actions managed by your team"
  - Diğer: "Actions from your manager's team"
- **View As Dropdown** (Admin için):
  - `team`, `team_manager` rolleri filtrelenir

##### B. Scorecard Filter
- **Seçenekler**: `2024+`, `all`
- **Etki**: Tablo verilerini filtreler

##### C. Stats Cards (İstatistik Kartları)
- **Total Actions**: Toplam aksiyon sayısı
- **Open**: Açık aksiyon sayısı
- **Overdue**: Gecikmiş aksiyon sayısı
- **Completed**: Tamamlanmış aksiyon sayısı
- **Financial Impact**: Finansal etki toplamı
- **Completion Rate**: Tamamlanma oranı yüzdesi

##### D. Actions Table (Aksiyonlar Tablosu)
- **Sütunlar**:
  - Key (Purple, monospace)
  - Summary
  - Description
  - Status (Badge ile)
  - Audit
  - Due Date
  - Risk Level (Badge ile)
  - Responsible
  - Actions (View/Edit butonları)
- **Özellikler**:
  - **Resizable Columns**: Sütun genişlikleri ayarlanabilir
  - **Drag & Drop Reordering**: Sütun sırası değiştirilebilir
  - **Sorting**: Sütun başlıklarına tıklayarak sıralama
  - **Pagination**: Sayfa başına 25, 50, 100 seçenekleri
  - **Search**: Genel arama kutusu
  - **Filters**:
    - Status Filter (Dropdown)
    - Audit Filter (Dropdown)
    - Risk Level Filter (Dropdown)
  - **Reset Filters**: Tüm filtreleri sıfırlama butonu
  - **Export**: Excel export butonu

##### E. Action Detail Modal
- **Trigger**: Tablodaki "View" butonu
- **İçerik**:
  - Key
  - Summary
  - Description
  - Status
  - Audit Name & Year
  - Due Date
  - Risk Level
  - Responsible
  - Financial Impact
- **Özellikler**:
  - ESC tuşu ile kapanır
  - Scroll edilebilir içerik

##### F. Expanded Row View (Mobil)
- **Trigger**: Satıra tıklama
- **İçerik**: Tüm action detayları expandable row içinde

---

### 3. Department Actions (Departman Aksiyonları)

**Route**: `/department-actions`  
**Erişim**: `admin`, `department_director`, `action_operator`

#### 📊 İçerik

##### A. Header
- **Başlık**: "Department Actions"
- **Açıklama**: Kullanıcının departmanına göre dinamik
- **View As Dropdown** (Admin için):
  - Sadece `department_director` rolleri

##### B. Scorecard Filter
- **Seçenekler**: `2024+`, `all`
- **Görsel**: Takvim ikonu ile

##### C. Status Distribution Chart (Donut Chart)
- **Veri**: Departman aksiyonlarının durum dağılımı
- **Renkler**: Dashboard ile aynı (Open: Mavi, Completed: Yeşil, vb.)
- **Özellikler**:
  - Hover'da tooltip
  - Responsive tasarım

##### D. Stats Cards
- **Total**: Toplam aksiyon sayısı
- **Open**: Açık aksiyon sayısı
- **Overdue**: Gecikmiş aksiyon sayısı
- **Completed**: Tamamlanmış aksiyon sayısı
- **Financial Impact**: Finansal etki
- **Completion Rate**: Tamamlanma oranı

##### E. Actions Table
- **Sütunlar**: My Actions ile benzer
- **Özellikler**:
  - Resizable columns
  - Drag & drop reordering
  - Sorting
  - Pagination
  - Search
  - Filters (Status, Audit, Risk Level)
  - Export

##### F. Action Detail Modal
- My Actions ile aynı özellikler

---

### 4. C-Level Actions (Üst Yönetim Aksiyonları)

**Route**: `/clevel-actions`  
**Erişim**: `admin`, `top_management`

#### 📊 İçerik

##### A. Header
- **Başlık**: "C-Level Actions"
- **Açıklama**: "Executive-level audit finding actions overview"
- **View As Dropdown** (Admin için):
  - Sadece `top_management` rolleri

##### B. Scorecard Filter
- **Seçenekler**: `2024+`, `all`

##### C. Status Distribution Chart (Donut Chart)
- **Veri**: C-Level aksiyonlarının durum dağılımı
- **Özellikler**: Department Actions ile benzer

##### D. Stats Cards
- **Total**: Toplam aksiyon sayısı
- **Open**: Açık aksiyon sayısı
- **Overdue**: Gecikmiş aksiyon sayısı
- **Completed**: Tamamlanmış aksiyon sayısı
- **Financial Impact**: Finansal etki
- **Completion Rate**: Tamamlanma oranı
- **Overdue Rate**: Gecikme oranı
- **Money Open**: Açık aksiyonların finansal etkisi
- **Money Overdue**: Gecikmiş aksiyonların finansal etkisi

##### E. Actions Table
- **Sütunlar**: 
  - Key, Summary, Description, Status, Audit, Due Date, Risk Level, Responsible, C-Level, Actions
- **Özellikler**: Diğer sayfalarla aynı

##### F. Action Detail Modal
- Diğer sayfalarla aynı özellikler

---

### 5. All Findings Actions (Tüm Bulgular ve Aksiyonlar)

**Route**: `/all-findings-actions`  
**Erişim**: `admin`, `team`, `team_manager`

#### 📊 İçerik

##### A. Header
- **Başlık**: "All Findings & Actions"
- **Açıklama**: "Comprehensive view of all audit findings and actions"

##### B. Scorecard Filter
- **Seçenekler**: `2024+`, `all`

##### C. Report Chatbot
- **Konum**: Sayfa üstü, sağ tarafta
- **Özellikler**:
  - Doğal dil ile filtreleme
  - Örnek: "Show me all overdue actions from Financial Audit"
  - Filtreleri otomatik parse eder ve uygular
  - Active filters badge'leri gösterir
  - Filter'ları kaldırma özelliği

##### D. Dynamic Filters
- **Filter Menu**: "+ Add Filter" butonu
- **Filter Fields**:
  - Status
  - Audit Name
  - Audit Lead
  - Risk Level
  - Action Responsible
  - C-Level
- **Active Filters**: Seçili filtreler badge olarak gösterilir
- **Remove Filter**: Her badge'de X butonu

##### E. Actions Table
- **Sütunlar**: 
  - Key, Summary, Description, Status, Audit, Due Date, Risk Level, Responsible, C-Level, Actions
- **Özellikler**: 
  - Resizable columns
  - Drag & drop reordering
  - Sorting
  - Pagination
  - Search
  - Export
  - Dynamic filtering (chatbot + manual)

##### F. Action Detail Modal
- Diğer sayfalarla aynı özellikler

---

### 6. Annual Audit Plan (Yıllık Denetim Planı)

**Route**: `/annual-audit-plan`  
**Erişim**: `admin`

#### 📊 İçerik

##### A. Header
- **Başlık**: "Annual Audit Plan"
- **Açıklama**: "Manage and track annual audit plans"

##### B. View Mode Toggle
- **Seçenekler**:
  1. **Progress View** (Varsayılan)
     - Progress chart ile görselleştirme
  2. **Kanban View**
     - Kanban board (To Do, In Progress, Completed, On Hold)
  3. **Calendar View**
     - Takvim görünümü
     - Tarih filtreleri ile

##### C. Year Filter
- **Dropdown**: Yıl seçimi
- **Etki**: Tüm view'ları filtreler

##### D. Actions
- **Create Plan**: Yeni plan oluşturma butonu
- **Bulk Upload**: Excel ile toplu yükleme
- **Export**: Excel export

##### E. Progress View
- **Chart**: Audit plan progress chart
- **Veri**: Yıla göre plan durumları
- **Interaktif**: Chart elementlerine tıklanabilir

##### F. Kanban View
- **Columns**: 
  - To Do
  - In Progress
  - Completed
  - On Hold
- **Drag & Drop**: Kartlar sütunlar arası taşınabilir
- **Kart Detayları**: 
  - Audit Name
  - Status
  - Lead
  - Dates
  - Risk Level

##### G. Calendar View
- **Takvim Görünümü**: Aylık takvim
- **Filtreler**:
  - Date Range
  - Audit Leads (Multi-select)
- **Events**: Planlar takvim üzerinde gösterilir
- **Interaktif**: Event'lere tıklanınca detay modal açılır

##### H. Audit Plan Form Modal
- **Trigger**: "Create Plan" veya "Edit" butonu
- **Fields**:
  - Audit Name
  - Audit Year
  - Start Date
  - End Date
  - Audit Lead
  - Status
  - Risk Level
  - Description
- **Özellikler**:
  - Validation
  - ESC tuşu ile kapanır
  - Save/Cancel butonları

##### I. Audit Plan Detail Modal
- **Trigger**: Plan kartına/event'ine tıklama
- **İçerik**: Plan detayları
- **Actions**: Edit, Delete, Status Change

##### J. Bulk Upload Modal
- **Trigger**: "Bulk Upload" butonu
- **Özellikler**:
  - Excel dosyası yükleme
  - Preview
  - Validation
  - Error handling
  - Upload progress

---

### 7. Audit Maturity (Denetim Olgunluk)

**Route**: `/audit-maturity`  
**Erişim**: `admin`

#### 📊 İçerik

##### A. Header
- **Başlık**: "Audit Maturity Assessment"
- **Açıklama**: "Track audit maturity scores and progress"

##### B. MAT Scores Table
- **Veri Kaynağı**: Jira MAT project
- **Sütunlar**:
  - Object (Denetim objesi)
  - Score (0-5 arası skor)
  - Status (Durum)
- **Renk Kodlaması**:
  - Score >= 4: Yeşil
  - Score >= 3: Mavi
  - Score >= 2: Sarı
  - Score < 2: Kırmızı

##### C. Google Sheets Data Table
- **Veri Kaynağı**: Google Sheets entegrasyonu
- **Dinamik Sütunlar**: Sheet'teki kolonlara göre
- **Özellikler**: 
  - Hover effects
  - Responsive

##### D. Maturity Overview
- **Chart**: Maturity skorları görselleştirmesi
- **Trend Analysis**: Zaman içindeki değişimler

---

## Diğer Sayfalar

### Access Management
**Route**: `/access-management`  
**Erişim**: `admin`  
**İçerik**: Kullanıcı ve rol yönetimi

### Risk Management
**Route**: `/risk-management`  
**Erişim**: `admin`  
**İçerik**: Risk değerlendirme ve takibi

### Audit Finding
**Route**: `/audit-findings`  
**Erişim**: `admin`  
**İçerik**: Denetim bulguları yönetimi

### Audit Universe
**Route**: `/audit-universe`  
**Erişim**: `admin`  
**İçerik**: Denetim evreni yönetimi

### Task Manager
**Route**: `/tasks`  
**Erişim**: `admin`, `team`, `team_manager`  
**İçerik**: Görev yönetim sistemi

---

## Ortak Özellikler

### 1. View As (Impersonation)

#### Genel Bakış
View As özelliği, admin kullanıcılarının başka kullanıcıların görünümüne geçmesini sağlar. Bu özellik, destek ve kontrol amaçlı kullanılır.

#### Kimler Kullanabilir
- **Sadece `admin` rolü** View As özelliğini kullanabilir
- Diğer roller bu özelliği göremez

#### Nasıl Çalışır

**1. Kullanıcı Seçimi**
- Admin, View As dropdown butonuna tıklar
- Dropdown açılır ve filtrelenmiş kullanıcı listesi gösterilir
- Her sayfada farklı roller filtrelenir:
  - **Dashboard**: `team`, `team_manager` rolleri
  - **My Actions**: `team`, `team_manager` rolleri
  - **Department Actions**: `department_director` rolleri
  - **C-Level Actions**: `top_management` rolleri
- Dropdown içinde arama yapılabilir (email veya isim ile)

**2. Impersonation Başlatma**
- Admin, listeden bir kullanıcı seçer
- Sistem `authService.viewAsUser()` fonksiyonunu çağırır
- Seçilen kullanıcının bilgileri `userService.getAccessManagementUsers()` ile alınır
- Kullanıcı bilgileri `localStorage`'a `impersonated_user` key'i ile kaydedilir
- Orijinal kullanıcı bilgileri `mock_user` key'i ile korunur

**3. Sayfa Yenileme**
- Impersonation başarılı olduktan sonra sayfa otomatik olarak reload edilir
- `authService.getCurrentUser()` fonksiyonu `impersonated_user` key'ini kontrol eder
- Eğer `impersonated_user` varsa, o kullanıcının bilgileri döndürülür
- `isImpersonating: true` ve `originalUser` bilgileri set edilir

**4. Veri Filtreleme**
- Sayfa reload olduktan sonra, tüm veri çekme fonksiyonları impersonated user'ın email'ini kullanır
- Örnek: `getDepartmentFindingActions({ userEmail: impersonatedUser.email })`
- Tüm chart'lar, tablolar ve listeler seçilen kullanıcıya göre filtrelenmiş verileri gösterir

**5. UI Göstergeleri**
- Header'da "Viewing as [User Name]" mesajı gösterilir
- View As dropdown'da seçili kullanıcı işaretlenir
- "Stop Impersonation" butonu görünür hale gelir

**6. Impersonation Durdurma**
- "Stop Impersonation" butonuna tıklanır
- `authService.stopImpersonation()` fonksiyonu çağrılır
- `localStorage`'dan `impersonated_user` key'i silinir
- Sayfa tekrar reload edilir
- Orijinal kullanıcının verileri geri yüklenir

#### Teknik Detaylar

**localStorage Yapısı:**
```javascript
// Impersonation öncesi
localStorage.setItem('mock_user', JSON.stringify(originalUser))

// Impersonation sırasında
localStorage.setItem('impersonated_user', JSON.stringify(impersonatedUser))
localStorage.setItem('mock_user', JSON.stringify(originalUser)) // Korunur

// Impersonation sonrası
localStorage.removeItem('impersonated_user')
```

**Auth Store State:**
```typescript
{
  user: impersonatedUser,        // Seçilen kullanıcı
  role: impersonatedUser.role,   // Seçilen kullanıcının rolü
  isImpersonating: true,         // Impersonation durumu
  originalUser: originalUser    // Orijinal admin kullanıcı
}
```

**Veri Filtreleme Mantığı:**
```typescript
// Department Actions örneği
const { data: actions } = useDepartmentFindingActions({
  auditYear: scorecardFilter,
  userEmail: (role === 'admin' && !isImpersonating) 
    ? undefined  // Admin ve impersonating değilse tüm veriler
    : user?.email  // Impersonating ise seçilen kullanıcının email'i
});
```

#### Güvenlik Notları
- Sadece admin rolü bu özelliği kullanabilir
- Impersonation durumu her sayfa yüklemesinde kontrol edilir
- Orijinal kullanıcı bilgileri her zaman korunur
- Logout yapıldığında hem `mock_user` hem de `impersonated_user` temizlenir

### 2. Scorecard Filter
- **Tüm Sayfalarda**: Yıl bazlı filtreleme
- **Seçenekler**: `2024+`, `all`
- **Etki**: Chart ve tablo verilerini filtreler

### 3. Resizable Columns
- **Özellik**: Tablo sütun genişlikleri ayarlanabilir
- **Kayıt**: localStorage'a kaydedilir
- **Kullanım**: Sütun kenarından sürükleyerek

### 4. Drag & Drop Column Reordering
- **Özellik**: Sütun sırası değiştirilebilir
- **Kayıt**: localStorage'a kaydedilir
- **Kullanım**: Sütun başlığından sürükleyerek

### 5. Sorting
- **Özellik**: Sütun başlıklarına tıklayarak sıralama
- **Durumlar**: Ascending, Descending, None
- **Görsel**: Ok ikonları ile gösterilir

### 6. Pagination
- **Seçenekler**: 25, 50, 100 items per page
- **Navigation**: Previous, Next, Page numbers
- **Gösterge**: "Showing X to Y of Z items"

### 7. Search
- **Özellik**: Genel arama kutusu
- **Kapsam**: Tüm sütunlarda arama
- **Real-time**: Yazarken filtreleme

### 8. Filters
- **Türler**: Status, Audit, Risk Level, vb.
- **Görsel**: Dropdown'lar
- **Reset**: Tüm filtreleri sıfırlama butonu
- **Active Filters**: Badge'ler ile gösterilir

### 9. Export
- **Format**: Excel (.xlsx)
- **İçerik**: Filtrelenmiş tablo verileri
- **Loading**: Export sırasında loading gösterilir

### 10. Modals
- **Kapatma**: 
  - X butonu
  - ESC tuşu
  - Dışarı tıklama (bazı modallarda)
- **Scroll**: Modal içeriği scroll edilebilir
- **Responsive**: Mobilde tam ekran

### 11. Auto Scroll
- **Kullanım**: 
  - Toggle açıldığında ilgili bölüme scroll
  - Modal açıldığında modal'a scroll
- **Offset**: 200px header için

### 12. Sticky Elements
- **Toggle Buttons**: Scroll'da sabit kalır
- **Header**: Sabit header
- **Mobil**: Mobilde sticky toggle'lar

---

## Kullanıcı Rolleri ve Yetkiler

### Admin
- **Tüm Sayfalara Erişim**: ✅
- **View As**: ✅ (Tüm rollerde)
- **CRUD İşlemleri**: ✅
- **Export**: ✅
- **Filter Management**: ✅

### Team Manager
- **Erişim**:
  - Dashboard ✅
  - My Actions ✅
  - All Findings Actions ✅
  - Task Manager ✅
- **View As**: ❌
- **CRUD**: Sınırlı (kendi takımı)
- **Export**: ✅

### Team
- **Erişim**:
  - Dashboard ✅
  - My Actions ✅
  - All Findings Actions ✅
  - Task Manager ✅
- **View As**: ❌
- **CRUD**: Sınırlı (kendi aksiyonları)
- **Export**: ✅

### Department Director
- **Erişim**:
  - Department Actions ✅
- **View As**: ❌
- **CRUD**: Sınırlı (kendi departmanı)
- **Export**: ✅

### Top Management
- **Erişim**:
  - C-Level Actions ✅
- **View As**: ❌
- **CRUD**: Sınırlı (kendi aksiyonları)
- **Export**: ✅

### CEO
- **Erişim**:
  - Dashboard ✅
- **View As**: ❌
- **CRUD**: ❌
- **Export**: ✅

---

## Interaktif Özellikler

### 1. Chart Interactions

#### Pie Chart (Finding Actions Status)
- **Click**: Pie slice'a tıklanınca modal açılır
- **Hover**: Tooltip gösterilir
- **Modal**: ActionDetailsModal açılır, ilgili durumdaki aksiyonlar listelenir

#### Bar Chart (Audit Findings by Year)
- **Hover**: Tooltip gösterilir
- **Legend**: Alt kısımda, tıklanabilir (seri göster/gizle)

#### Radar Chart (Audit Maturity)
- **Hover**: Tooltip gösterilir (format: "Boyut: Değer / 5")
- **Point Labels**: Gizli (sadece hover'da görünür)
- **Multiple Datasets**: 2024 ve 2025 karşılaştırması

#### Donut Chart (Status Distribution)
- **Hover**: Tooltip gösterilir
- **Click**: (Gelecekte modal açılabilir)

### 2. Table Interactions

#### Cell Click (Action Breakdown Table)
- **Click**: Sayılara tıklanınca modal açılır
- **Modal**: ActionsListModal açılır
- **Filtreleme**: Modal'da ilgili audit, risk level ve mode'a göre filtrelenmiş liste

#### Row Click
- **Desktop**: "View" butonu ile modal açılır
- **Mobile**: Satıra tıklanınca expandable row açılır

#### Column Header Click
- **Sort**: Sıralama toggle'ları (asc → desc → none)
- **Drag**: Sütun sırası değiştirme
- **Resize**: Sütun genişliği ayarlama

### 3. Filter Interactions

#### Dropdown Filters
- **Click**: Dropdown açılır
- **Select**: Seçim yapılınca filtre uygulanır
- **Clear**: "All" seçeneği ile filtre kaldırılır

#### Search Filter
- **Type**: Real-time filtreleme
- **Clear**: X butonu ile temizleme

#### Active Filters
- **Badge Display**: Seçili filtreler badge olarak gösterilir
- **Remove**: X butonu ile kaldırılır

### 4. Modal Interactions

#### Opening
- **Trigger**: Buton, chart element, table cell
- **Animation**: Fade in
- **Focus**: Modal'a otomatik focus
- **Scroll Lock**: Body scroll kilitlenir

#### Closing
- **X Button**: Sağ üst köşe
- **ESC Key**: Klavye kısayolu
- **Outside Click**: (Bazı modallarda)
- **Animation**: Fade out

#### Content
- **Scroll**: İçerik scroll edilebilir
- **Responsive**: Mobilde tam ekran

### 5. Toggle Interactions

#### Show/Hide Charts
- **Click**: Toggle butonu
- **Animation**: Smooth scroll
- **Sticky**: Scroll'da sabit kalır
- **State**: localStorage'a kaydedilir (bazı durumlarda)

### 6. View Mode Toggle (Annual Audit Plan)
- **Click**: View mode değiştirilir
- **Modes**: Progress, Kanban, Calendar
- **State**: Seçili mode localStorage'a kaydedilir

### 7. Kanban Interactions
- **Drag & Drop**: Kartlar sütunlar arası taşınabilir
- **Card Click**: Detay modal açılır
- **Status Update**: Drag ile status güncellenir

### 8. Calendar Interactions
- **Date Click**: Tarihe tıklanınca event detayları
- **Event Click**: Event'e tıklanınca modal açılır
- **Date Range Filter**: Tarih aralığı seçimi
- **Lead Filter**: Multi-select dropdown

### 9. Export Interactions
- **Click**: Export butonu
- **Loading**: Export sırasında loading gösterilir
- **Download**: Excel dosyası indirilir
- **Error Handling**: Hata durumunda mesaj gösterilir

### 10. View As Interactions

#### Dropdown Açma/Kapama
- **Trigger**: "View As" butonuna tıklama
- **İçerik**: Filtrelenmiş kullanıcı listesi (role göre)
- **Arama**: Dropdown içinde real-time arama (email veya isim)
- **Kapatma**: Dışarı tıklama veya ESC tuşu

#### Kullanıcı Seçimi
- **Click**: Listeden bir kullanıcıya tıklama
- **Loading**: Seçim sırasında loading gösterilir
- **Success**: Başarılı olursa sayfa reload edilir
- **Error**: Hata durumunda mesaj gösterilir

#### Impersonation Durumu
- **Gösterge**: Header'da "Viewing as [User Name]" mesajı
- **Dropdown**: Seçili kullanıcı işaretlenir
- **Stop Button**: "Stop Impersonation" butonu görünür

#### Impersonation Durdurma
- **Trigger**: "Stop Impersonation" butonuna tıklama
- **Action**: `localStorage` temizlenir, sayfa reload edilir
- **Result**: Orijinal kullanıcının görünümüne dönülür

---

## Teknik Detaylar

### State Management
- **Zustand**: Auth store, UI store
- **React Query**: Server state, caching
- **Local State**: useState hooks

### Data Fetching
- **React Query**: useQuery, useMutation
- **Custom Hooks**: useDepartmentFindingActions, useCLevelFindingActions, vb.
- **Caching**: 2 dakika stale time

### Performance Optimizations
- **useMemo**: Hesaplanmış değerler
- **useCallback**: Function memoization
- **React.memo**: Component memoization
- **Lazy Loading**: Route-based code splitting

### Responsive Design
- **Breakpoints**: 
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Mobile Features**:
  - Touch swipe
  - Carousel navigation
  - Expandable rows
  - Full-screen modals

### Accessibility
- **Keyboard Navigation**: Tab, Enter, ESC
- **ARIA Labels**: Screen reader support
- **Focus Management**: Modal focus trap
- **Color Contrast**: WCAG AA compliant

---

## Sonuç

Bu dokümantasyon, projenin tüm özelliklerini, interaktif elementlerini ve kullanıcı akışlarını kapsamaktadır. Sistem mimarisi, kullanıcı rolleri, sayfa yapıları ve teknik detaylar bu dokümanda detaylı olarak açıklanmıştır.
