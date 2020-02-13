export const funcAlias: { [x: string]: string } = {
  'any': 'oneOf',
  'all': 'allOf',
  'map': 'mapOf',
  stopAllDoT: 'stopAllDamageOverTime',
  stopAllHoT: 'stopAllHealOverTime',
  startDoT: 'startDamageOverTime',
  startHoT: 'startHealOverTime',
  stopDoT: 'stopDamageOverTime',
  stopHoT: 'stopHealOverTime',
}
export const enumAlias: { [x: string]: string } = {
  Map: 'Maps',
  Position: 'Pos',
  Comms: 'Communicate'
}
export const enumType: { [x: string]: string } = {
}
export const typeAlias: { [x: string]: string } = {
  DIRECTION: 'Vector',
  'STRING CONSTANT': 'Strings',
  'VARIABLE': 'STRING',
  'SUBROUTINE': 'STRING',
  'COMPARE OPERATOR': 'CompareSymbol',
}
export const paramTypeAlias: { [x: string]: string } = {
  'chasePlayerVariableOverTime.duration': 'NUMBER',
  'bigMessage.header': 'Strings',
  'hudText.header': 'Strings?',
  'hudText.subheader': 'Strings?',
  'hudText.text': 'Strings?',
  'createInWorldText.header': 'Strings',
  'setObjectiveDescription.header': 'Strings',
  'smallMessage.header': 'Strings',
  'customString.param0': 'Strings',
  'customString.param1': 'Strings',
  'customString.param2': 'Strings',
  'indexOfArrayValue.value': 'ANY',
  'setStatusEffect.assister': 'PLAYER | PLAYER[] | NULL'
}
export const constAlias: { [x: string]: string }  = {
  'GET_LAST_CREATED_ENTITY': 'LAST_CREATED_ENTITY',
  'GET_LAST_DAMAGE_MODIFICATION': 'LAST_DAMAGE_MODIFICATION',
  'GET_LAST_DO_T': 'LAST_DAMAGE_ID',
  'GET_LAST_HO_T': 'LAST_HEAL_ID',
  'GET_LAST_HEALING_MODIFICATION': 'LAST_HEALING_MODIFICATION',
  'GET_LAST_CREATED_TEXT': 'LAST_CREATED_TEXT',
  'GET_MATCH_ROUND': 'MATCH_ROUND',
  'GET_MATCH_TIME': 'MATCH_TIME',
  'GET_CURRENT_OBJECTIVE': 'CURRENT_OBJECTIVE',
  'GET_PAYLOAD_POSITION': 'PAYLOAD_POSITION',
  'GET_PAYLOAD_PROGRESS_PERCENTAGE': 'PAYLOAD_PROGRESS_PERCENTAGE',
  'GET_CAPTURE_PERCENTAGE': 'CAPTURE_PERCENTAGE',
  'GET_SERVER_LOAD': 'SERVER_LOAD',
  'GET_AVERAGE_SERVER_LOAD': 'AVERAGE_SERVER_LOAD',
  'GET_PEAK_SERVER_LOAD': 'PEAK_SERVER_LOAD',
  'GET_TOTAL_TIME_ELAPSED': 'TOTAL_TIME_ELAPSED',
}