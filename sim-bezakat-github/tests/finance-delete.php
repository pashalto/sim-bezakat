<?php
declare(strict_types=1);
define('NO_SESSION',true);
require dirname(__DIR__).'/app/bootstrap.php';
require dirname(__DIR__).'/app/finance.php';
$checks=0;
function finance_check(bool $ok,string $label): void {global $checks;if(!$ok)throw new RuntimeException($label);$checks++;echo "PASS $label\n";}
$valid=['periodId'=>'-1','category'=>'current','documentId'=>'9007199254740993'];
finance_check(finance_delete_input($valid)===$valid,'bigint document ID stays string');
foreach ([['ownerId'=>'other'],['category'=>'other'],['documentId'=>1],['documentId'=>'1 OR 1=1'],['periodId'=>null]] as $change) {
 $rejected=false;try {finance_delete_input(array_replace($valid,$change));}catch(PortalError $e){$rejected=$e->status===422;}
 finance_check($rejected,'reject invalid deletion '.json_encode(array_keys($change)));
}
$rejected=false;try{finance_delete(['role'=>'coordinator']);}catch(PortalError $e){$rejected=$e->status===403;}
finance_check($rejected,'coordinator cannot delete awardee documents');
echo "$checks checks passed\n";
