$base = "d:\next-level\mess meal management"
function List-Files {
    param([string]$Path)
    try {
        Get-ChildItem -Path $Path -Recurse -File | Sort-Object FullName | ForEach-Object {
            $rel = $_.FullName.Substring($base.Length + 1)
            Write-Host $rel
        }
    } catch {
        Write-Host "ERROR: $_"
    }
}
List-Files $base
