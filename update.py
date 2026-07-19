import argparse
import gzip
import json
import shutil
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List
from urllib.request import Request, urlopen


DATA_SOURCE_LIST = [
    f"http://ronnywang-twcompany.s3-website-ap-northeast-1.amazonaws.com/files/{prefix}.json.gz"
    for prefix in [
        "00000000", "10000000", "20000000", "30000000", "40000000",
        "50000000", "60000000", "70000000", "80000000", "90000000",
        "bussiness-00000000", "bussiness-10000000", "bussiness-20000000",
        "bussiness-30000000", "bussiness-40000000", "bussiness-50000000",
        "bussiness-60000000", "bussiness-70000000", "bussiness-80000000",
        "bussiness-90000000",
    ]
]


def download_source(source: str, cache_dir: Path, refresh: bool) -> Path:
    """Cache snapshots locally so interrupted rebuilds can resume safely."""

    cache_dir.mkdir(parents=True, exist_ok=True)
    file_path = cache_dir / source.rsplit("/", 1)[-1]
    if file_path.exists() and file_path.stat().st_size > 0 and not refresh:
        return file_path
    temporary_path = file_path.with_suffix(f"{file_path.suffix}.part")
    temporary_path.unlink(missing_ok=True)
    request = Request(source, headers={"User-Agent": "taiwan-company-network-data-updater/2.0"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=120) as response, temporary_path.open("wb") as output:
                shutil.copyfileobj(response, output)
            temporary_path.replace(file_path)
            break
        except OSError:
            temporary_path.unlink(missing_ok=True)
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    return file_path


def read_source_data(sources: Iterable[str], cache_dir: Path, refresh: bool) -> List[Dict[str, Any]]:
    """Download and parse raw company data from all sources.

    The source changed its status field from 公司狀況 to 登記現況. Supporting both
    keeps newly registered companies in the published dataset.
    """

    result_list: List[Dict[str, Any]] = []
    for source in sources:
        file_path = download_source(source, cache_dir, refresh)
        print(file_path)
        with gzip.open(file_path, "rt", encoding="utf-8") as fp:
            for line in fp:
                _, target_string = line.split(",", 1)
                target_json = json.loads(target_string)
                status = target_json.get("公司狀況") or target_json.get("登記現況")
                if status != "核准設立" or not target_json.get("代表人姓名"):
                    continue
                result_list.append({
                    "id": target_json["id"],
                    "公司名稱": target_json["公司名稱"],
                    "資本總額": target_json.get("資本總額(元)", "0"),
                    "代表人姓名": target_json["代表人姓名"],
                    "公司所在地": target_json.get("公司所在地", ""),
                    "董監事名單": target_json.get("董監事名單") or [],
                })
    return result_list


def calculate_legal_persons(json_list: Iterable[Dict[str, Any]]) -> Dict[str, int]:
    """Count appearances for legal person entities represented by directors."""

    names_dict: Dict[str, int] = {}
    for company in json_list:
        for director in company["董監事名單"]:
            legal_person = director.get("所代表法人")
            if isinstance(legal_person, list) and len(legal_person) > 1 and legal_person[1]:
                names_dict[legal_person[1]] = names_dict.get(legal_person[1], 0) + 1
    return dict(sorted(names_dict.items(), key=lambda item: item[1], reverse=True))


def normalize_capital(raw_value: Any) -> int:
    """Convert capital amount string into an integer value."""

    return int("0" + str(raw_value).replace(",", ""))


def create_empty_node() -> Dict[str, Any]:
    return {"in": [], "out": []}


def build_graph(json_list: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Create the relationship graph between companies and legal persons."""

    graph_dict: Dict[str, Dict[str, Any]] = {
        key: create_empty_node() for key in calculate_legal_persons(json_list)
    }
    for company in json_list:
        company_name = company["公司名稱"]
        graph_dict.setdefault(company_name, create_empty_node())
        for investor in company["董監事名單"]:
            legal_person = investor.get("所代表法人")
            if not (isinstance(legal_person, list) and len(legal_person) > 1):
                continue
            investor_name = legal_person[1]
            if investor_name not in graph_dict:
                continue
            if investor_name not in graph_dict[company_name]["in"]:
                graph_dict[company_name]["in"].append(investor_name)
            if company_name not in graph_dict[investor_name]["out"]:
                graph_dict[investor_name]["out"].append(company_name)
    return graph_dict


def build_details(json_list: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {
        company["公司名稱"]: {
            "id": company["id"],
            "資本總額": normalize_capital(company["資本總額"]),
            "代表人姓名": company["代表人姓名"],
            "公司所在地": company["公司所在地"],
        }
        for company in json_list
    }


def save_json(data: Dict[str, Any], file_name: str) -> None:
    """Atomically persist a UTF-8 JSON data file."""

    target = Path(file_name)
    temporary = target.with_suffix(f"{target.suffix}.tmp")
    with temporary.open("w", encoding="utf-8") as fp:
        json.dump(data, fp, ensure_ascii=False, separators=(",", ":"))
    temporary.replace(target)


def save_details_chunks(details: Dict[str, Dict[str, Any]], output_dir: Path, chunk_count: int = 2) -> None:
    """Split details below GitHub's 100 MB per-file limit for Pages deployment."""

    output_dir.mkdir(parents=True, exist_ok=True)
    chunks: List[Dict[str, Dict[str, Any]]] = [dict() for _ in range(chunk_count)]
    for index, (name, record) in enumerate(details.items()):
        chunks[index % chunk_count][name] = record
    names = []
    for index, chunk in enumerate(chunks):
        name = f"company_details_{index}.json"
        save_json(chunk, str(output_dir / name))
        names.append(name)
    save_json({"chunks": names}, str(output_dir / "company_details_manifest.json"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the company relationship data files.")
    parser.add_argument("--refresh", action="store_true", help="Re-download raw source snapshots.")
    args = parser.parse_args()
    data_list = read_source_data(DATA_SOURCE_LIST, Path("./cache"), args.refresh)
    print("total count company:", len(data_list))
    save_json(build_graph(data_list), "./public/data/graph.json")
    save_details_chunks(build_details(data_list), Path("./public/data"))
