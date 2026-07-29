/**
 * Собирает счётчики скачиваний со всех релизов и ведёт ленту событий.
 * Запускается автоматически каждые 30 минут.
 */
import fs from 'node:fs'
import path from 'node:path'

const REPO = process.env.TRACK_REPO || 'Sm1-Tee/chit-ai'
const TOKEN = process.env.GITHUB_TOKEN || ''
const DATA_DIR = 'data'
const STATE_FILE = path.join(DATA_DIR, 'downloads-state.json')
const LOG_FILE = path.join(DATA_DIR, 'downloads-log.json')
const MAX_EVENTS = 400

async function ghJson(url) {
	const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'chit-ai-download-tracker' }
	if (TOKEN) headers.Authorization = 'Bearer ' + TOKEN
	const res = await fetch(url, { headers })
	if (!res.ok) throw new Error('GitHub API ' + res.status + ' for ' + url)
	return res.json()
}

async function fetchAllReleases() {
	const all = []
	for (let page = 1; page <= 10; page++) {
		const batch = await ghJson('https://api.github.com/repos/' + REPO + '/releases?per_page=100&page=' + page)
		all.push(...batch)
		if (batch.length < 100) break
	}
	return all
}

function readJson(file, fallback) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'))
	} catch {
		return fallback
	}
}

function variantOf(assetName) {
	const n = assetName.toLowerCase()
	if (n.includes('color')) return 'color'
	if (n.includes('bw') || n.includes('b-w') || n.includes('_bw')) return 'bw'
	return 'other'
}

const releases = await fetchAllReleases()

const counts = {}
const meta = {}
let total = 0
const totalsByRelease = []

for (const rel of releases) {
	const tag = rel.tag_name || ''
	let relTotal = 0
	for (const asset of rel.assets || []) {
		const key = tag + '|' + asset.name
		counts[key] = asset.download_count
		meta[key] = {
			tag,
			release: rel.name || tag,
			asset: asset.name,
			variant: variantOf(asset.name),
		}
		relTotal += asset.download_count
		total += asset.download_count
	}
	totalsByRelease.push({
		tag,
		release: rel.name || tag,
		publishedAt: rel.published_at || null,
		total: relTotal,
	})
}

totalsByRelease.sort((a, b) => b.total - a.total)

const prev = readJson(STATE_FILE, null)
const log = readJson(LOG_FILE, { events: [] })
if (!Array.isArray(log.events)) log.events = []

const now = new Date().toISOString()
let newEvents = 0

if (prev && prev.counts) {
	const grown = []
	for (const key of Object.keys(counts)) {
		const before = typeof prev.counts[key] === 'number' ? prev.counts[key] : 0
		const delta = counts[key] - before
		if (delta > 0) {
			grown.push({
				at: now,
				release: meta[key].release,
				tag: meta[key].tag,
				asset: meta[key].asset,
				variant: meta[key].variant,
				delta,
				total: counts[key],
			})
		}
	}
	grown.sort((a, b) => b.delta - a.delta)
	log.events = grown.concat(log.events).slice(0, MAX_EVENTS)
	newEvents = grown.length
} else {
	console.log('Первый запуск: записан только базовый снимок, событий пока нет.')
}

log.updatedAt = now
log.total = total
log.startedAt = log.startedAt || now
log.totalsByRelease = totalsByRelease

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.writeFileSync(STATE_FILE, JSON.stringify({ updatedAt: now, total, counts }, null, '\t') + '\n')
fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, '\t') + '\n')

console.log('Релизов: ' + releases.length + ', всего скачиваний: ' + total + ', новых событий: ' + newEvents)
