export function setupFilters({ defaultList, renderList }) {
	const versionFilter = document.getElementById("version-filter");
	const softwareSelect = document.getElementById("software-select");
	const searchBar = document.getElementById("search-bar");


	const versionRegex = /^\d+(?:\.\d+)*(?:[-a-zA-Z0-9\.]*)?$/; // allow digits and dots, optional suffix like -beta.5

	if (searchBar) {
		searchBar.addEventListener("input", applyFilters);
	}

	function populateVersionFilter() {
		if (!versionFilter) return;
		const versionsSet = new Set();
		defaultList.forEach(server => {
			const v = server.version;
			if (!v || v === "Unknown") return;
			if (!versionRegex.test(v)) return;
			versionsSet.add(v);
		});

		const versions = Array.from(versionsSet);


		function compareVersionsDesc(a, b) {
			const [amain, asuf] = a.split(/-(.+)/);
			const [bmain, bsuf] = b.split(/-(.+)/);
			const aparts = amain.split('.').map(p => parseInt(p, 10) || 0);
			const bparts = bmain.split('.').map(p => parseInt(p, 10) || 0);
			const len = Math.max(aparts.length, bparts.length);
			for (let i = 0; i < len; i++) {
				const na = aparts[i] || 0;
				const nb = bparts[i] || 0;
				if (na !== nb) return nb - na; // descending
			}
			// numeric parts equal, prefer no-suffix (release) over suffix (pre-release)
			if (asuf && !bsuf) return 1; // b (no suffix) is newer -> b first -> return positive for descending
			if (!asuf && bsuf) return -1;
			if (asuf && bsuf) return bsuf.localeCompare(asuf);
			return 0;
		}

		versions.sort(compareVersionsDesc);

		while (versionFilter.options.length > 1) versionFilter.remove(1);

		versions.forEach(v => {
			const option = document.createElement("option");
			option.value = v;
			option.textContent = v;
			versionFilter.appendChild(option);
		});
	}

	function populateSoftwareFilter() {
		if (!softwareSelect) return;
		defaultList.forEach(server => {
			const t = server.type || "Unknown";
			if (!Array.from(softwareSelect.options).some(opt => opt.value === t)) {
				const option = document.createElement("option");
				option.value = t;
				option.textContent = t;
				softwareSelect.appendChild(option);
			}
		});
	}

	function applyFilters() {
		const query = (searchBar && searchBar.value) ? searchBar.value.toLowerCase() : "";
		const selectedVersion = versionFilter ? versionFilter.value : "";
		const selectedSoftware = softwareSelect ? softwareSelect.value : "";

		let filtered = defaultList.slice();

		if (query) {
			filtered = filtered.filter(server =>
				server.name.toLowerCase().includes(query) ||
				server.motd.toLowerCase().includes(query)
			);
		}

		if (selectedVersion) {
			filtered = filtered.filter(server => server.version === selectedVersion);
		}

		if (selectedSoftware) {
			filtered = filtered.filter(server => server.type === selectedSoftware);
		}

		renderList(filtered);
	}

	if (versionFilter) versionFilter.addEventListener("change", applyFilters);
	if (softwareSelect) softwareSelect.addEventListener("change", applyFilters);

	return { populateVersionFilter, populateSoftwareFilter, filterListByVersion: (list, version) => list.filter(server => server.version === version), filterListBySoftware: (list) => list.filter(server => server.type !== "Unknown") };
}
