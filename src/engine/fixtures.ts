/** Three full Spanish demo call transcripts for offline local engine. */
/** Demo 1 Javier hot buy; Demo 2 Elena angry rent; Demo 3 Diego investor. */

export const DEMO_1_JAVIER = `Agente: Buenos días, CallInsight Inmobiliaria, le atiende Marta. ¿En qué puedo ayudarle?
Cliente: Hola Marta, soy Javier Ruiz. Me interesa mucho el piso de tres dormitorios en Chamberí que tenéis publicado. ¿Sigue disponible?
Agente: Sí, Javier, sigue disponible. Es un tercero exterior en la calle Galileo, 118 m², reformado. ¿Me puede dejar un teléfono de contacto?
Cliente: Claro, el 612 445 778. Y mi correo es javier.ruiz@email.com. Estoy buscando para comprar, no para alquilar.
Agente: Perfecto. ¿Qué presupuesto maneja?
Cliente: Hasta unos 620.000 euros, un poco más si está muy bien. Quiero mudarme en menos de dos meses porque mi mujer empieza a trabajar cerca de Nuevos Ministerios.
Agente: Entiendo, urgencia alta entonces. ¿Han visto ya alguna visita?
Cliente: Todavía no. Me gustaría visitarlo esta misma semana, el jueves por la tarde si es posible. También estoy mirando uno de Idealista en Alonso Martínez, pero el vuestro me encaja mejor por la terraza.
Agente: Genial. Anoto la visita para el jueves a las 18:00. ¿Alguna duda más?
Cliente: Sí, ¿el edificio tiene ascensor y trastero? Y me preocupa un poco el IBI y las cuotas de comunidad.
Agente: Ascensor sí, trastero opcional en el sótano. Te paso la nota simple y los gastos por WhatsApp.
Cliente: Perfecto, muchas gracias Marta. Estoy bastante ilusionado con este piso.
Agente: Encantada, Javier. Nos vemos el jueves.`

export const DEMO_2_ELENA = `Agente: Hola, buenos días, soy Carlos de CallInsight. ¿Hablo con Elena?
Cliente: Sí, soy Elena Vargas. Os llamo por el alquiler del piso en Embajadores. La verdad es que estoy bastante cabreada.
Agente: Siento oír eso, Elena. ¿Qué ha pasado?
Cliente: Quedamos en visitarlo el martes y nadie apareció. Perdí una hora. Además en Idealista pone 1.050 € y en vuestra web 1.150 €. No me parece serio.
Agente: Tiene razón, pido disculpas. Hubo un fallo de agenda. El precio correcto es 1.100 € más comunidad. ¿Quiere que le ofrezca otra franja?
Cliente: No sé… Estoy mirando también en Fotocasa uno de Lavapiés más barato. Solo busco alquiler, no compra. Presupuesto máximo 1.100 al mes. Zona Embajadores o alrededores.
Agente: Entendido. ¿Me deja su teléfono para reubicar la visita?
Cliente: 698 221 004. Correo elena.vargas@correo.es. Pero si volvéis a fallarme, paso de vosotros. Estoy un poco harta de inmobiliarias.
Agente: Lo entiendo. Puedo enseñárselo mañana a las 10:00 y le confirmo por WhatsApp una hora antes.
Cliente: Vale, mañana a las 10. Pero quiero ver el contrato y saber si admiten mascotas, tengo un gato. También me preocupa la fianza de dos meses, me parece excesiva.
Agente: Anoto lo de la mascota y le aclaro la fianza. Gracias por darnos otra oportunidad, Elena.
Cliente: Ya veremos. Hasta mañana.`

export const DEMO_3_DIEGO = `Agente: CallInsight Inmobiliaria, buenos días, habla Lucía.
Cliente: Hola Lucía, soy Diego Molina. Llamo porque busco un piso para inversión en Madrid, zona Salamanca o Chamberí si el precio cuadra.
Agente: Encantada, Diego. ¿Qué rentabilidad busca y qué presupuesto tiene?
Cliente: Presupuesto entre 380.000 y 450.000 euros. Quiero algo que pueda alquilar después por encima de 1.400 € al mes. No tengo prisa extrema, pero sí me gustaría cerrar en este trimestre.
Agente: ¿Me facilita contacto?
Cliente: Teléfono 655 890 112, email diego.molina.inv@mail.com. Vivo cerca de Nuevos Ministerios. Zona preferente: lista Chamberí / Trafalgar.
Agente: Perfecto. Tenemos un estudio reformado en Trafalgar a 410.000 y un dos dormitorios en Goya algo por encima. ¿Ha hablado con otras agencias?
Cliente: Sí, Engel & Völkers me enseñó uno en Lista, pero el precio pedía demasiado. También miré en Idealista varios de particulares. Me frena un poco la incertidumbre de tipos de interés y el IBI alto en Salamanca.
Agente: Tiene sentido. ¿Quiere que le prepare una comparativa de rentabilidad bruta y le cite para ver Trafalgar?
Cliente: Sí, enviadme la comparativa por email y vemos visita la semana que viene. No busco vivienda habitual, es inversión pura. Sentimiento: estoy interesado pero prudente.
Agente: Se la mando hoy mismo. Gracias, Diego.
Cliente: Gracias, Lucía. Hasta pronto.`

export const FIXTURES = [
  { id: 'demo-1', label: 'Demo 1 — Compra Chamberí', name: 'Javier · Chamberí · compra', text: DEMO_1_JAVIER },
  { id: 'demo-2', label: 'Demo 2 — Alquiler frío', name: 'Elena · Embajadores · alquiler', text: DEMO_2_ELENA },
  { id: 'demo-3', label: 'Demo 3 — Inversor Valencia', name: 'Diego · Molina · inversión', text: DEMO_3_DIEGO },
] as const
